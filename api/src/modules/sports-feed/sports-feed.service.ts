// api/src/modules/sports-feed/sports-feed.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NormalizedEvent,
  NormalizedLiveEvent,
  SPORTS_FEED_PROVIDER,
  SportsFeedProvider,
} from './sports-feed.types';
import { buildTeamLogoIndex, matchTeamLogo } from './team-logo.match';
import { teamLogoUrl } from './team-logo-cache.service';

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

  /**
   * Live (in-play) matches from the provider — ephemeral, not cached. Team
   * crests are cross-matched from the API-Football catalog by name; unmatched
   * teams keep null logos (the UI falls back to an initials badge).
   */
  async fetchLive(): Promise<NormalizedLiveEvent[]> {
    const events = await this.provider.fetchLive();
    if (events.length === 0) return events;

    const teams = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true },
    });
    if (teams.length === 0) return events;

    const index = buildTeamLogoIndex(teams);
    const logo = (name: string): string | null => {
      const ref = matchTeamLogo(name, index);
      // Point at our cached, self-hosted copy — never hotlink the source.
      return ref ? teamLogoUrl(ref.externalId) : null;
    };
    return events.map((e) => ({
      ...e,
      homeLogo: logo(e.homeTeam) ?? e.homeLogo,
      awayLogo: logo(e.awayTeam) ?? e.awayLogo,
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
      startsAt: e.startsAt,
      oddHome: e.oddHome,
      oddDraw: e.oddDraw,
      oddAway: e.oddAway,
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
