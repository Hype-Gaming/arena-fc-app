// api/src/modules/sports-feed/sports-feed.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NormalizedEvent,
  SPORTS_FEED_PROVIDER,
  SportsFeedProvider,
} from './sports-feed.types';

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

  /** Live (in-play) matches straight from the provider — ephemeral, not cached. */
  fetchLive() {
    return this.provider.fetchLive();
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
