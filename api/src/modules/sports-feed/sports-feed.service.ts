// api/src/modules/sports-feed/sports-feed.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NormalizedEvent,
  NormalizedEventPreview,
  NormalizedLiveEvent,
  SPORTS_FEED_PROVIDER,
  SportsFeedProvider,
} from './sports-feed.types';
import {
  buildTeamLogoIndex,
  matchTeamLogo,
  TeamLogoIndex,
} from './team-logo.match';
import { teamLogoUrl } from './team-logo-cache.service';
import { parseEsportivaEventId } from './esportiva-link';

export interface SyncEventsSummary {
  provider: string;
  fetched: number;
  upserted: number;
}

/** In-play odds/scores move fast, but not per-request: a short shared cache
 *  collapses a burst of viewers into one upstream call. Override via env. */
const LIVE_FEED_TTL_MS = Number(process.env.LIVE_FEED_TTL_MS ?? 8_000);
/** The crest catalog only changes on a sync; the index is safe to reuse for a
 *  minute rather than re-scanning the Team table on every feed call. */
const TEAM_INDEX_TTL_MS = Number(process.env.TEAM_INDEX_TTL_MS ?? 60_000);

@Injectable()
export class SportsFeedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SPORTS_FEED_PROVIDER)
    private readonly provider: SportsFeedProvider,
  ) {}

  /** Enriched live feed, memoized for LIVE_FEED_TTL_MS (see fetchLive). */
  private liveCache: { at: number; data: NormalizedLiveEvent[] } | null = null;
  /** Built logo index, memoized for TEAM_INDEX_TTL_MS (see teamLogoIndex). */
  private indexCache: { at: number; index: TeamLogoIndex } | null = null;

  /**
   * The crest lookup index, cached. Every feed path (live, upcoming, preview)
   * needs it, and building it means a full Team-table scan + Map construction —
   * far too heavy to repeat on each request. Rebuilt at most once per TTL; a
   * freshly-synced crest shows up within that window.
   */
  async teamLogoIndex(): Promise<TeamLogoIndex> {
    const now = Date.now();
    if (this.indexCache && now - this.indexCache.at < TEAM_INDEX_TTL_MS) {
      return this.indexCache.index;
    }
    const teams = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const index = buildTeamLogoIndex(teams);
    this.indexCache = { at: now, index };
    return index;
  }

  /** Upcoming prematch events straight from the provider (not cached). */
  fetchUpcoming(): Promise<NormalizedEvent[]> {
    return this.provider.fetchUpcoming();
  }

  /**
   * Preview for one event pasted as an Esportiva link (or bare id): identity,
   * kickoff and the full popular-markets board (Handicap, Resultado Correto,
   * Intervalo/final, …), with crests cross-matched from the catalog. The admin
   * pastes a link and sees the card before creating the bilhete.
   */
  async getEventPreview(
    ref: string,
  ): Promise<NormalizedEventPreview & { homeLogo: string | null; awayLogo: string | null }> {
    const id = parseEsportivaEventId(ref);
    if (!id) {
      throw new BadRequestException('Cole um link ou ID de evento da Esportiva');
    }
    const preview = await this.provider.fetchEventPreview(id);

    const index = await this.teamLogoIndex();
    const crest = (name: string): string | null => {
      const ref = matchTeamLogo(name, index, preview.countryIso);
      return ref ? teamLogoUrl(ref.externalId) : null;
    };
    return {
      ...preview,
      homeLogo: crest(preview.homeTeam),
      awayLogo: crest(preview.awayTeam),
    };
  }

  /**
   * Live (in-play) matches from the provider — ephemeral, not cached. Team
   * crests are cross-matched from the API-Football catalog by name; unmatched
   * teams keep null logos (the UI falls back to an initials badge).
   */
  async fetchLive(): Promise<NormalizedLiveEvent[]> {
    const now = Date.now();
    if (this.liveCache && now - this.liveCache.at < LIVE_FEED_TTL_MS) {
      return this.liveCache.data;
    }

    const events = await this.provider.fetchLive();
    if (events.length === 0) {
      this.liveCache = { at: now, data: events };
      return events;
    }

    const index = await this.teamLogoIndex();
    const logo = (name: string, iso: string | null): string | null => {
      const ref = matchTeamLogo(name, index, iso);
      // Point at our cached, self-hosted copy — never hotlink the source.
      return ref ? teamLogoUrl(ref.externalId) : null;
    };
    const enriched = events.map((e) => ({
      ...e,
      homeLogo: logo(e.homeTeam, e.countryIso) ?? e.homeLogo,
      awayLogo: logo(e.awayTeam, e.countryIso) ?? e.awayLogo,
    }));
    this.liveCache = { at: now, data: enriched };
    return enriched;
  }

  /** Cached upcoming fixtures for the admin picker (soonest first, optional name filter). */
  list(q?: string) {
    return this.prisma.sportEvent.findMany({
      where: {
        startsAt: { gte: new Date() },
        ...(q
          ? {
              OR: [
                { homeTeam: { contains: q, mode: 'insensitive' } },
                { awayTeam: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  /**
   * Upcoming fixtures from the cached feed (kickoff still in the future),
   * soonest first — the real games the IA Tipster offers to analyze. The cache
   * is populated by the admin "sync" action (or the sync cron).
   */
  upcomingCached(limit = 20) {
    return this.prisma.sportEvent.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: limit,
    });
  }

  /** Pull the provider's upcoming events and upsert them into the cache. */
  async sync(): Promise<SyncEventsSummary> {
    const events = await this.provider.fetchUpcoming();

    // The feed returns hundreds of fixtures; run upserts in bounded-concurrency
    // batches so one admin click isn't hundreds of sequential round-trips.
    const CHUNK = 25;
    let upserted = 0;
    for (let i = 0; i < events.length; i += CHUNK) {
      const slice = events.slice(i, i + CHUNK);
      await Promise.all(slice.map((e) => this.upsertEvent(e)));
      upserted += slice.length;
    }
    await this.prunePastEvents();
    return { provider: this.provider.name, fetched: events.length, upserted };
  }

  private prunePastEvents() {
    return this.prisma.sportEvent.deleteMany({
      where: {
        provider: this.provider.name,
        startsAt: { lt: new Date() },
      },
    });
  }

  private upsertEvent(e: NormalizedEvent) {
    const fields = {
      homeTeam: e.homeTeam,
      awayTeam: e.awayTeam,
      competition: e.competition,
      countryIso: e.countryIso,
      startsAt: e.startsAt,
      oddHome: e.oddHome,
      oddDraw: e.oddDraw,
      oddAway: e.oddAway,
      // Persist the structured markets so the admin picker can offer every
      // outcome (Over/Under, BTTS, …), not just 1X2. Prisma Json wants a
      // plain value; [] when the event has no core market.
      markets: e.markets as unknown as Prisma.InputJsonValue,
      deepLink: e.deepLink,
    };
    return this.prisma.sportEvent.upsert({
      where: {
        provider_externalId: {
          provider: this.provider.name,
          externalId: e.externalId,
        },
      },
      create: { provider: this.provider.name, externalId: e.externalId, ...fields },
      update: { ...fields, syncedAt: new Date() },
    });
  }
}
