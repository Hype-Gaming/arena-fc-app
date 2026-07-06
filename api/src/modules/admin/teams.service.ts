// api/src/modules/admin/teams.service.ts
import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import { TeamLogoCacheService } from '../sports-feed/team-logo-cache.service';
import {
  buildTeamLogoIndex,
  matchTeamLogo,
  teamKey,
} from '../sports-feed/team-logo.match';
import { countryToIso3 } from '../sports-feed/country-iso';
import { resolveLeagueId } from './esportiva-leagues';
import { normalizeText } from '../tipster/match-search.util';

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

export interface LiveLogoSyncSummary {
  liveTeams: number;
  alreadyMatched: number;
  searched: number;
  added: number;
  notFound: number;
  /** Left unsearched this run to protect the daily API quota. */
  skippedForCap: number;
}

export interface EsportivaLeagueSyncSummary {
  leaguesInFeed: number;
  synced: number;
  failed: number;
  teamsUpserted: number;
  skippedForCap: number;
  /** Feed competitions we don't have an API-Football mapping for. */
  unmapped: string[];
}

/** Free API-Football tier only covers up to this season. */
const CATALOG_SEASON = 2024;
/** Cap league syncs per run so one click can't burn the daily quota. */
const LEAGUE_CAP = 30;

// Reserve/youth sides API-Football returns for a plain name search — never the
// crest we want for a first-team live match.
const RESERVE = /\b(ii|iii|b|u-?1\d|u-?2\d|sub-?\d+|reserves?|youth|academy)\b/i;
// One live-logo sync fires at most this many /teams searches (free tier = 100/day).
const SEARCH_CAP = 40;

function apiKey(): string | undefined {
  return process.env.API_FOOTBALL_KEY;
}

function apiHost(): string {
  return process.env.API_FOOTBALL_URL ?? 'v3.football.api-sports.io';
}

@Injectable()
export class AdminTeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sportsFeed: SportsFeedService,
    private readonly logoCache: TeamLogoCacheService,
  ) {}

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

  /**
   * Populate crests for the teams currently in play: for each live team name we
   * can't already resolve from the catalog, search API-Football, upsert the
   * team and warm its logo into the image cache. Bounded by SEARCH_CAP so a
   * single click can't burn the daily quota — run it again to pick up the rest.
   */
  async syncLiveLogos(): Promise<LiveLogoSyncSummary> {
    const key = apiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'API_FOOTBALL_KEY is not configured on the server',
      );
    }

    const events = await this.sportsFeed.fetchLive();
    // Remember each team's country (from its live event) for the search tiebreak.
    const isoByName = new Map<string, string | null>();
    for (const e of events) {
      for (const n of [e.homeTeam, e.awayTeam]) {
        if (n && !isoByName.has(n)) isoByName.set(n, e.countryIso);
      }
    }
    const names = [...isoByName.keys()];

    const catalog = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const index = buildTeamLogoIndex(catalog);
    const unmatched = names.filter(
      (n) => !matchTeamLogo(n, index, isoByName.get(n)),
    );

    let searched = 0;
    let added = 0;
    let notFound = 0;
    let skippedForCap = 0;

    for (const name of unmatched) {
      if (searched >= SEARCH_CAP) {
        skippedForCap += 1;
        continue;
      }
      searched += 1;
      const best = await this.searchTeam(name, isoByName.get(name) ?? null, key);
      if (!best) {
        notFound += 1;
        continue;
      }
      await this.prisma.team.upsert({
        where: { externalId: best.id },
        create: {
          externalId: best.id,
          name: best.name,
          code: best.code,
          country: best.country,
          logoUrl: best.logo,
        },
        update: {
          name: best.name,
          code: best.code,
          country: best.country,
          logoUrl: best.logo,
        },
      });
      await this.logoCache.warm(best.id, best.logo);
      added += 1;
    }

    return {
      liveTeams: names.length,
      alreadyMatched: names.length - unmatched.length,
      searched,
      added,
      notFound,
      skippedForCap,
    };
  }

  /**
   * Pull teams for the leagues currently in the Esportiva feed: read the
   * upcoming fixtures, map each distinct competition to its API-Football league
   * (country-disambiguated), and sync those leagues into the catalog. Bounded by
   * LEAGUE_CAP; a league whose season isn't on the free tier is skipped, not
   * fatal. This is what makes the "from-events" bilhetes come out with crests.
   */
  async syncEsportivaLeagues(): Promise<EsportivaLeagueSyncSummary> {
    const key = apiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'API_FOOTBALL_KEY is not configured on the server',
      );
    }

    const events = await this.sportsFeed.fetchUpcoming();
    const leagueIds = new Set<number>();
    const unmapped = new Set<string>();
    for (const e of events) {
      const id = resolveLeagueId(e.countryIso, e.competition);
      if (id) leagueIds.add(id);
      else if (e.competition) unmapped.add(e.competition);
    }

    const ids = [...leagueIds].slice(0, LEAGUE_CAP);
    let synced = 0;
    let failed = 0;
    let teamsUpserted = 0;
    for (const id of ids) {
      try {
        const r = await this.sync(id, CATALOG_SEASON);
        teamsUpserted += r.upserted;
        synced += 1;
      } catch {
        // Season not on the free tier, or a transient error — skip this league.
        failed += 1;
      }
    }

    return {
      leaguesInFeed: leagueIds.size,
      synced,
      failed,
      teamsUpserted,
      skippedForCap: Math.max(0, leagueIds.size - ids.length),
      unmapped: [...unmapped].sort().slice(0, 25),
    };
  }

  /** One API-Football team search; returns the best first-team match or null. */
  private async searchTeam(
    name: string,
    iso: string | null,
    key: string,
  ): Promise<ApiFootballTeamRow['team'] | null> {
    const query = searchQuery(name);
    if (query.length < 3) return null;

    let rows: ApiFootballTeamRow[];
    try {
      const res = await fetch(
        `https://${apiHost()}/teams?search=${encodeURIComponent(query)}`,
        { headers: { 'x-apisports-key': key } },
      );
      const body = (await res.json()) as ApiFootballTeamsResponse;
      rows = body.response ?? [];
    } catch {
      // A transient blip on one team must not abort the whole batch — skip it
      // (it will be retried on the next sync).
      return null;
    }

    let candidates = rows.map((r) => r.team).filter((t) => t?.id && t.logo);
    if (candidates.length === 0) return null;

    // Country tiebreak: when the live event tells us the country, keep only
    // same-country candidates (so a "Barcelona" in Brazil can't take Spain's).
    if (iso) {
      const sameCountry = candidates.filter(
        (t) => countryToIso3(t.country) === iso,
      );
      if (sameCountry.length > 0) candidates = sameCountry;
    }

    // Prefer an exact key match; otherwise the shortest non-reserve name.
    const wantedKey = teamKey(name);
    const exact = candidates.find((t) => teamKey(t.name) === wantedKey);
    if (exact) return exact;

    return (
      candidates
        .filter((t) => !RESERVE.test(t.name))
        .sort((a, b) => a.name.length - b.name.length)[0] ?? null
    );
  }
}

/** Order-preserving search query: drop club numbers and BR state suffixes. */
function searchQuery(name: string): string {
  return normalizeText(name)
    .replace(/[.\-_/]/g, ' ')
    .split(' ')
    .filter((t) => t && !/^\d+$/.test(t))
    .filter(
      (t) =>
        !/^(rj|sp|mg|rs|pr|ba|ce|go|pe|pa|am|ma|pb|rn|al|es|mt|ms|df|to|ap|ro|rr|pi)$/.test(
          t,
        ),
    )
    .join(' ')
    .trim();
}
