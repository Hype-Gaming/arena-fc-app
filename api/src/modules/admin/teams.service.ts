// api/src/modules/admin/teams.service.ts
import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsFeedService } from '../sports-feed/sports-feed.service';
import {
  TeamLogoCacheService,
  teamLogoUrl,
} from '../sports-feed/team-logo-cache.service';
import {
  buildTeamLogoIndex,
  matchTeamLogo,
  teamKey,
} from '../sports-feed/team-logo.match';
import { countryToIso3 } from '../sports-feed/country-iso';
import { nationEnglishName } from '../sports-feed/nation-aliases';
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

export interface NationalTeamSyncSummary {
  competitions: number;
  synced: number;
  failed: number;
  teamsUpserted: number;
}

/**
 * Season the catalog pulls squads for. The free tier only covered up to 2024;
 * a paid tier covers the current season, so this is env-driven — bump
 * API_FOOTBALL_SEASON when the new season's squads are published.
 */
function catalogSeason(): number {
  return Number(process.env.API_FOOTBALL_SEASON ?? 2025);
}
/**
 * Cap league syncs per run so one click/cron can't burn the daily quota.
 * Free tier is 100/day → keep it low; Pro is 7.500/day → 80 leagues is cheap.
 */
function leagueCap(): number {
  return Number(process.env.API_FOOTBALL_LEAGUE_CAP ?? 80);
}
/** Max /teams searches one live-logo sync spends (protects the daily quota). */
function searchCap(): number {
  return Number(process.env.API_FOOTBALL_SEARCH_CAP ?? 200);
}

/**
 * Curated top competitions whose current-season squads we keep fresh on a
 * schedule, so promoted / newly-added teams resolve crests without an admin
 * ever clicking "sync". ~25 leagues = ~25 API requests per run — trivial on a
 * paid tier. IDs are API-Football league ids.
 */
const TOP_LEAGUES: number[] = [
  39, 40, // England: Premier League, Championship
  140, 141, // Spain: LaLiga, LaLiga 2
  135, 136, // Italy: Serie A, Serie B
  78, 79, // Germany: Bundesliga, 2. Bundesliga
  61, 62, // France: Ligue 1, Ligue 2
  94, // Portugal: Primeira Liga
  88, // Netherlands: Eredivisie
  71, 72, // Brazil: Série A, Série B
  128, // Argentina: Liga Profesional
  253, 262, // USA MLS, Mexico Liga MX
  307, // Saudi Pro League
  2, 3, 848, // UEFA: Champions League, Europa League, Conference League
  13, 11, // CONMEBOL: Libertadores, Sul-Americana
];

// National-team competitions (API-Football league/season) whose squads are the
// seleções that show up in international fixtures. Three requests cover ~50+
// nations, so a paste-a-link preview of a World Cup / Euro / Copa América game
// finds the crests in the catalog on the first try. Seasons are inside the free
// window (2022–2024); a rejected one is skipped, not fatal.
const NATIONAL_TEAM_COMPETITIONS: { league: number; season: number }[] = [
  { league: 1, season: 2022 }, // World Cup (32 nations)
  { league: 4, season: 2024 }, // Euro (24 nations)
  { league: 9, season: 2024 }, // Copa América (16 nations)
];

// Reserve/youth sides API-Football returns for a plain name search — never the
// crest we want for a first-team live match.
const RESERVE = /\b(ii|iii|b|u-?1\d|u-?2\d|sub-?\d+|reserves?|youth|academy)\b/i;

function apiKey(): string | undefined {
  return process.env.API_FOOTBALL_KEY;
}

function apiHost(): string {
  return process.env.API_FOOTBALL_URL ?? 'v3.football.api-sports.io';
}

@Injectable()
export class AdminTeamsService {
  private readonly logger = new Logger(AdminTeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sportsFeed: SportsFeedService,
    private readonly logoCache: TeamLogoCacheService,
  ) {}

  /**
   * Keep live-match crests filling in on their own: cross-match the current
   * in-play teams against the catalog and download any missing logos. The crest
   * cache is cumulative, so the "Ao Vivo" tab shows more crests over time with no
   * admin action. No-ops when API_FOOTBALL_KEY isn't configured.
   *
   * Cadence: each run spends up to searchCap() API-Football searches. On the
   * Pro tier (7.500/day) the default every-2h (≤12 runs/day × 200 = 2.400) is
   * well within budget. Override with LIVE_LOGO_SYNC_CRON / API_FOOTBALL_SEARCH_CAP.
   */
  @Cron(process.env.LIVE_LOGO_SYNC_CRON || '0 0 */2 * * *')
  async syncLiveLogosJob(): Promise<void> {
    if (!apiKey()) return;
    try {
      const s = await this.syncLiveLogos();
      if (s.added > 0) {
        this.logger.log(
          `live-logo sync: +${s.added} crest(s) (${s.alreadyMatched}/${s.liveTeams} already matched)`,
        );
      }
    } catch (err) {
      this.logger.warn(`live-logo sync failed: ${(err as Error).message}`);
    }
  }

  /**
   * Keep the catalog current: re-pull the top competitions' squads for the
   * current season on a daily schedule, so promoted / newly-added clubs resolve
   * crests on the live and "próximos jogos" tabs without any admin action.
   * ~25 requests/run — negligible on a paid tier. No-ops without a key.
   */
  @Cron(process.env.TOP_LEAGUE_SYNC_CRON || '0 30 4 * * *')
  async syncTopLeaguesJob(): Promise<void> {
    if (!apiKey()) return;
    const season = catalogSeason();
    let synced = 0;
    let teams = 0;
    for (const id of TOP_LEAGUES) {
      try {
        const r = await this.sync(id, season);
        teams += r.upserted;
        synced += 1;
      } catch {
        // Season not published yet / transient — skip this league, keep going.
      }
    }
    if (synced > 0) {
      this.logger.log(
        `top-league sync: ${synced}/${TOP_LEAGUES.length} leagues, ${teams} team(s) (season ${season})`,
      );
    }
  }

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

    const cap = searchCap();
    for (const name of unmatched) {
      if (searched >= cap) {
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
   * Best-effort fallback used when a fixture team/selection is not in the local
   * catalog yet. Returns the app's cached crest URL after upserting/warming.
   */
  async resolveTeamLogo(name: string, iso: string | null = null): Promise<string | null> {
    if (!name.trim()) return null;

    // Catalog first: instant, free, and covers every synced club/seleção.
    const catalog = await this.prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const hit = matchTeamLogo(name, buildTeamLogoIndex(catalog), iso);
    if (hit) return teamLogoUrl(hit.externalId);

    const key = apiKey();
    if (!key) return null;

    const best = await this.searchTeam(name, iso, key);
    if (!best) return null;

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
    return teamLogoUrl(best.id);
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

    const ids = [...leagueIds].slice(0, leagueCap());
    const season = catalogSeason();
    let synced = 0;
    let failed = 0;
    let teamsUpserted = 0;
    for (const id of ids) {
      try {
        const r = await this.sync(id, season);
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

  /**
   * Pull national-team squads (World Cup / Euro / Copa América) into the
   * catalog so seleção crests resolve instantly on the first preview. Guarded
   * per competition; a season the free tier rejects is skipped, not fatal.
   */
  async syncNationalTeams(): Promise<NationalTeamSyncSummary> {
    const key = apiKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'API_FOOTBALL_KEY is not configured on the server',
      );
    }

    let synced = 0;
    let failed = 0;
    let teamsUpserted = 0;
    for (const { league, season } of NATIONAL_TEAM_COMPETITIONS) {
      try {
        const r = await this.sync(league, season);
        teamsUpserted += r.upserted;
        synced += 1;
      } catch {
        failed += 1;
      }
    }

    return {
      competitions: NATIONAL_TEAM_COMPETITIONS.length,
      synced,
      failed,
      teamsUpserted,
    };
  }

  /** One API-Football team search; returns the best first-team match or null. */
  private async searchTeam(
    name: string,
    iso: string | null,
    key: string,
  ): Promise<ApiFootballTeamRow['team'] | null> {
    // Seleções: search API-Football under its English name ("Suíça" →
    // "Switzerland"), otherwise the PT name never matches the English catalog.
    const canonical = nationEnglishName(name) ?? name;
    const query = searchQuery(canonical);
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
    const wantedKey = teamKey(canonical);
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
