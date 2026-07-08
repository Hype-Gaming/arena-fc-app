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
import { buildTeamLogoIndex, matchTeamLogo } from './team-logo.match';
import { teamLogoUrl } from './team-logo-cache.service';
import { parseEsportivaEventId } from './esportiva-link';

export interface SyncEventsSummary {
  provider: string;
  fetched: number;
  upserted: number;
}

@Injectable()
export class SportsFeedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SPORTS_FEED_PROVIDER)
    private readonly provider: SportsFeedProvider,
  ) {}

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

    const teams = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const index = buildTeamLogoIndex(teams);
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
    const events = await this.provider.fetchLive();
    if (events.length === 0) return events;

    const teams = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    if (teams.length === 0) return events;

    const index = buildTeamLogoIndex(teams);
    const logo = (name: string, iso: string | null): string | null => {
      const ref = matchTeamLogo(name, index, iso);
      // Point at our cached, self-hosted copy — never hotlink the source.
      return ref ? teamLogoUrl(ref.externalId) : null;
    };
    return events.map((e) => ({
      ...e,
      homeLogo: logo(e.homeTeam, e.countryIso) ?? e.homeLogo,
      awayLogo: logo(e.awayTeam, e.countryIso) ?? e.awayLogo,
    }));
  }

  /** Cached fixtures for the admin picker (soonest first, optional name filter). */
  list(q?: string) {
    return this.prisma.sportEvent.findMany({
      where: q
        ? {
            OR: [
              { homeTeam: { contains: q, mode: 'insensitive' } },
              { awayTeam: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
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
    return { provider: this.provider.name, fetched: events.length, upserted };
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
