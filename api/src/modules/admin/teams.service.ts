// api/src/modules/admin/teams.service.ts
import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Shape of one row in API-Football's GET /teams response array. */
interface ApiFootballTeamRow {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    logo: string;
  };
}

interface ApiFootballTeamsResponse {
  errors: unknown[] | Record<string, string>;
  results: number;
  response: ApiFootballTeamRow[];
}

export interface SyncSummary {
  league: number;
  season: number;
  fetched: number;
  upserted: number;
}

function apiKey(): string | undefined {
  // Canonical name first; also accept the historical typo used in .env files.
  return process.env.API_FOOTBALL_KEY ?? process.env.API_FOOTEBALL_KEY;
}

function apiHost(): string {
  return (
    process.env.API_FOOTBALL_URL ??
    process.env.API_FOOTEBALL_URL ??
    'v3.football.api-sports.io'
  );
}

@Injectable()
export class AdminTeamsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catalog listing for the admin UI (optionally filtered by name). */
  list(q?: string) {
    return this.prisma.team.findMany({
      where: q
        ? { name: { contains: q, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * One league+season sync = ONE request against API-Football (free tier is
   * 100/day, and the free plan only covers seasons 2022–2024). Results are
   * cached in the Team table, so this is run rarely and on demand.
   */
  async sync(league: number, season: number): Promise<SyncSummary> {
    const key = apiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'API_FOOTBALL_KEY is not configured on the server',
      );
    }

    const url = `https://${apiHost()}/teams?league=${league}&season=${season}`;
    let body: ApiFootballTeamsResponse;
    try {
      const res = await fetch(url, {
        headers: { 'x-apisports-key': key },
      });
      body = (await res.json()) as ApiFootballTeamsResponse;
    } catch {
      throw new BadGatewayException('Could not reach the football API');
    }

    const errors = body.errors;
    const hasErrors = Array.isArray(errors)
      ? errors.length > 0
      : errors && Object.keys(errors).length > 0;
    if (hasErrors) {
      throw new BadGatewayException(
        `Football API rejected the request: ${JSON.stringify(errors)}`,
      );
    }

    let upserted = 0;
    for (const row of body.response ?? []) {
      const t = row.team;
      if (!t?.id || !t.name || !t.logo) continue;
      await this.prisma.team.upsert({
        where: { externalId: t.id },
        create: {
          externalId: t.id,
          name: t.name,
          code: t.code,
          country: t.country,
          logoUrl: t.logo,
          season,
        },
        update: {
          name: t.name,
          code: t.code,
          country: t.country,
          logoUrl: t.logo,
          season,
        },
      });
      upserted += 1;
    }

    return {
      league,
      season,
      fetched: body.results ?? body.response?.length ?? 0,
      upserted,
    };
  }
}
