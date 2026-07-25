// api/src/modules/sports-feed/altenar.normalize.ts
import {
  NormalizedEvent,
  NormalizedEventPreview,
  NormalizedLiveEvent,
  NormalizedMarket,
} from './sports-feed.types';

/** Subset of Altenar's GetEvents payload we rely on (confirmed against live data). */
export interface AltenarRaw {
  events?: AltenarEvent[];
  competitors?: { id: number; name: string; abbreviation?: string }[];
  markets?: { id: number; typeId: number; name: string; oddIds: number[] }[];
  odds?: { id: number; price: number; name: string; competitorId?: number }[];
  champs?: { id: number; name: string }[];
  /** Soccer categories are countries; `iso` is ISO-3166 alpha-3 (e.g. "BRA"). */
  categories?: { id: number; name: string; iso?: string }[];
}

interface AltenarEvent {
  id: number;
  name: string;
  startDate: string;
  status: number;
  competitorIds: number[];
  marketIds: number[];
  champId: number;
  catId: number;
  // Live-only (GetLiveEvents): elapsed label, status label, [home, away] score.
  liveTime?: string;
  ls?: string;
  score?: number[];
}

/** Match-winner / 1X2 market. Confirmed: typeId 1 = "Vencedor do encontro". */
const MATCH_WINNER_TYPE_ID = 1;

/**
 * The core markets we surface for bilhete-building, mapped to a stable slug.
 * typeIds confirmed against the live Esportiva/Altenar feed:
 *   1  1X2 (Vencedor do encontro)      10 Chance dupla (double chance)
 *   18 Total de gols (Over/Under)       11 Empate anula aposta (DNB)
 *   29 Ambas marcam (BTTS)
 * Odds outside these types are dropped (the book offers dozens per event).
 */
const MARKET_KEYS: Record<number, string> = {
  1: '1x2',
  18: 'over_under',
  10: 'double_chance',
  11: 'dnb',
  29: 'btts',
};

type AltenarMarket = NonNullable<AltenarRaw['markets']>[number];
type AltenarOdd = NonNullable<AltenarRaw['odds']>[number];

/** Pull the goal line off an Over/Under label ("Mais de 2.5" → 2.5). */
function parseLine(label: string): number | null {
  const m = label.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

/**
 * Build the structured market list for an event: every core market (see
 * MARKET_KEYS) that still has at least one live outcome. Selection labels come
 * straight from the feed (already Portuguese, e.g. "Mais de 2.5", "Sim"), so we
 * show exactly what the book shows. Suspended legs (price <= 0) are dropped.
 */
function extractMarkets(
  event: AltenarEvent,
  marketById: Map<number, AltenarMarket>,
  oddById: Map<number, AltenarOdd>,
): NormalizedMarket[] {
  const markets: NormalizedMarket[] = [];
  for (const marketId of event.marketIds ?? []) {
    const market = marketById.get(marketId);
    if (!market) continue;
    const key = MARKET_KEYS[market.typeId];
    if (!key) continue;

    const selections = (market.oddIds ?? [])
      .map((id) => oddById.get(id))
      .filter((o): o is AltenarOdd => !!o && typeof o.price === 'number' && o.price > 0)
      .map((o) => ({
        label: o.name?.trim() || '—',
        odd: o.price,
        line: key === 'over_under' ? parseLine(o.name ?? '') : null,
        oddId: o.id,
      }));
    if (selections.length > 0) {
      markets.push({ typeId: market.typeId, key, name: market.name, selections });
    }
  }
  return markets;
}

interface WinnerOdds {
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
}

/**
 * Pull the 1X2 prices off an event. A price of 0 means the leg is suspended
 * (common in-play) and comes back null. The draw leg carries no competitorId.
 */
function extractWinnerOdds(
  event: AltenarEvent,
  marketById: Map<number, AltenarMarket>,
  oddById: Map<number, AltenarOdd>,
  homeId: number | undefined,
  awayId: number | undefined,
): WinnerOdds {
  const out: WinnerOdds = { oddHome: null, oddDraw: null, oddAway: null };

  const winnerMarket = (event.marketIds ?? [])
    .map((id) => marketById.get(id))
    .find((m) => m?.typeId === MATCH_WINNER_TYPE_ID);
  if (!winnerMarket) return out;

  for (const oddId of winnerMarket.oddIds ?? []) {
    const odd = oddById.get(oddId);
    if (!odd || typeof odd.price !== 'number' || odd.price <= 0) continue;
    if (homeId !== undefined && odd.competitorId === homeId) {
      out.oddHome = odd.price;
    } else if (awayId !== undefined && odd.competitorId === awayId) {
      out.oddAway = odd.price;
    } else if (odd.competitorId == null) {
      out.oddDraw = odd.price;
    }
    // else: an outcome for some other competitor — ignore, don't clobber draw
  }
  return out;
}

/** Split "Botafogo vs. Santos" as a last resort when competitor ids are missing. */
function splitName(name: string): [string, string] {
  const m = name.split(/\s+vs\.?\s+/i);
  return [m[0]?.trim() ?? name, m[1]?.trim() ?? ''];
}

/**
 * Turn Altenar's normalized graph into flat NormalizedEvents. Pure and total:
 * skips events without two competitors, keeps those without a 1X2 market
 * (odds simply come back null). `deepLink(eventId)` builds the sportsbook URL.
 */
export function normalizeAltenar(
  raw: AltenarRaw,
  deepLink: (eventId: number) => string,
  now: Date = new Date(),
): NormalizedEvent[] {
  const competitorById = new Map((raw.competitors ?? []).map((c) => [c.id, c]));
  const marketById = new Map((raw.markets ?? []).map((m) => [m.id, m]));
  const oddById = new Map((raw.odds ?? []).map((o) => [o.id, o]));
  const champById = new Map((raw.champs ?? []).map((c) => [c.id, c]));
  const catById = new Map((raw.categories ?? []).map((c) => [c.id, c]));

  const out: NormalizedEvent[] = [];

  for (const ev of raw.events ?? []) {
    // Prematch only (status 0), and only fixtures that have not started.
    if (ev.status !== 0) continue;
    const startsAt = new Date(ev.startDate);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= now) continue;

    const homeId = ev.competitorIds?.[0];
    const awayId = ev.competitorIds?.[1];
    const [fbHome, fbAway] = splitName(ev.name);
    const homeTeam = competitorById.get(homeId)?.name ?? fbHome;
    const awayTeam = competitorById.get(awayId)?.name ?? fbAway;
    if (!homeTeam || !awayTeam) continue;

    const { oddHome, oddDraw, oddAway } = extractWinnerOdds(
      ev,
      marketById,
      oddById,
      homeId,
      awayId,
    );

    out.push({
      externalId: String(ev.id),
      homeTeam,
      awayTeam,
      competition: champById.get(ev.champId)?.name ?? null,
      countryIso: (catById.get(ev.catId)?.iso ?? '').toUpperCase() || null,
      startsAt,
      oddHome,
      oddDraw,
      oddAway,
      markets: extractMarkets(ev, marketById, oddById),
      deepLink: deepLink(ev.id),
    });
  }

  // Soonest first.
  out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return out;
}

/** Subset of Altenar's GetEventDetails payload (one event, all its markets). */
export interface AltenarEventDetails {
  id?: number;
  name?: string;
  startDate?: string;
  competitors?: { id: number; name: string }[];
  champ?: { id: number; name: string };
  /** Soccer category = country; `iso` present for national leagues, not "Mundo". */
  category?: { id: number; name: string; iso?: string };
  /** Book's own tabs; the first ("Principal") is the popular-markets set. */
  marketGroups?: { id: number; name: string; marketIds: number[]; sortOrder?: number }[];
  markets?: DetailMarket[];
  odds?: DetailOdd[];
}
interface DetailMarket {
  id: number;
  typeId: number;
  name: string;
  /** Special value: the line ("1.5", "-0.5") or a scoreline ("1:0"), or "". */
  sv?: string;
  /** Odd ids grouped by column; flattened before lookup. */
  desktopOddIds?: number[][];
}
interface DetailOdd {
  id: number;
  price: number;
  name: string;
  competitorId?: number;
  /** 0 = open; anything else is suspended/settled and skipped. */
  oddStatus?: number;
}

// Markets the book lists in "Principal" but that are noise for a tips ticket.
const EVENT_MARKET_DENY = new Set<number>([
  17725, // Monitor VAR (Y/N)
]);

/** A pure numeric line ("1.5", "-0.5") → number; a scoreline ("1:0") → null. */
function svLine(sv: string | undefined): number | null {
  if (!sv || !/^-?\d+(\.\d+)?$/.test(sv.trim())) return null;
  return Number(sv);
}

/**
 * Normalize a single event's full market board (GetEventDetails) into the same
 * NormalizedMarket[] shape as the bulk feed — but driven by the book's own
 * "Principal" tab so we surface exactly the popular markets a bettor sees
 * (1X2, Total, Handicap, Resultado Correto, Intervalo/final, team totals, …),
 * not the 5-market bulk subset. Markets sharing a typeId (e.g. every Over/Under
 * line) merge into one entry whose selections each carry their own line.
 * Suspended legs and markets with no live price (player props referencing child
 * odds) drop out naturally.
 */
export function normalizeAltenarEventDetails(
  raw: AltenarEventDetails,
): NormalizedMarket[] {
  const oddById = new Map((raw.odds ?? []).map((o) => [o.id, o]));
  const marketById = new Map((raw.markets ?? []).map((m) => [m.id, m]));

  // The popular set: the "Principal" group's markets in book order; fall back
  // to every market if the group is absent.
  const groups = raw.marketGroups ?? [];
  const principal =
    groups.find((g) => /principa|popular/i.test(g.name)) ??
    [...groups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
  const orderedIds = principal?.marketIds ?? (raw.markets ?? []).map((m) => m.id);

  // Merge markets by typeId, preserving first-seen order.
  const byType = new Map<number, NormalizedMarket>();
  for (const marketId of orderedIds) {
    const market = marketById.get(marketId);
    if (!market || EVENT_MARKET_DENY.has(market.typeId)) continue;

    const line = svLine(market.sv);
    const selections = (market.desktopOddIds ?? [])
      .flat()
      .map((id) => oddById.get(id))
      .filter(
        (o): o is DetailOdd =>
          !!o &&
          typeof o.price === 'number' &&
          o.price > 0 &&
          (o.oddStatus === undefined || o.oddStatus === 0),
      )
      .map((o) => ({ label: o.name?.trim() || '—', odd: o.price, line, oddId: o.id }));
    if (selections.length === 0) continue;

    const existing = byType.get(market.typeId);
    if (existing) {
      existing.selections.push(...selections);
    } else {
      byType.set(market.typeId, {
        typeId: market.typeId,
        key: MARKET_KEYS[market.typeId] ?? `t${market.typeId}`,
        name: market.name,
        selections,
      });
    }
  }

  return [...byType.values()];
}

/**
 * Full preview for one event (identity + kickoff + popular markets) from
 * GetEventDetails, for the paste-a-link admin flow. Crests are attached
 * downstream from the catalog. `deepLink` builds the sportsbook URL.
 */
export function normalizeAltenarEventPreview(
  raw: AltenarEventDetails,
  deepLink: (eventId: number) => string,
): NormalizedEventPreview {
  const [fbHome, fbAway] = splitName(raw.name ?? '');
  const competitors = raw.competitors ?? [];
  const startsAt = new Date(raw.startDate ?? 0);
  return {
    externalId: String(raw.id ?? ''),
    homeTeam: competitors[0]?.name ?? fbHome,
    awayTeam: competitors[1]?.name ?? fbAway,
    competition: raw.champ?.name ?? null,
    countryIso: (raw.category?.iso ?? '').toUpperCase() || null,
    startsAt: Number.isNaN(startsAt.getTime()) ? new Date(0) : startsAt,
    deepLink: deepLink(raw.id ?? 0),
    markets: normalizeAltenarEventDetails(raw),
  };
}

/**
 * Turn Altenar's GetLiveEvents graph into live fixtures with score + minute.
 * Same market/odds shape as prematch; here every event is in play, so we keep
 * them all and add the live state (liveTime/ls/score).
 */
export function normalizeAltenarLive(
  raw: AltenarRaw,
  deepLink: (eventId: number) => string,
): NormalizedLiveEvent[] {
  const competitorById = new Map((raw.competitors ?? []).map((c) => [c.id, c]));
  const marketById = new Map((raw.markets ?? []).map((m) => [m.id, m]));
  const oddById = new Map((raw.odds ?? []).map((o) => [o.id, o]));
  const champById = new Map((raw.champs ?? []).map((c) => [c.id, c]));
  const catById = new Map((raw.categories ?? []).map((c) => [c.id, c]));

  const out: NormalizedLiveEvent[] = [];

  for (const ev of raw.events ?? []) {
    const homeId = ev.competitorIds?.[0];
    const awayId = ev.competitorIds?.[1];
    const [fbHome, fbAway] = splitName(ev.name);
    const homeTeam = competitorById.get(homeId)?.name ?? fbHome;
    const awayTeam = competitorById.get(awayId)?.name ?? fbAway;
    if (!homeTeam || !awayTeam) continue;

    const { oddHome, oddDraw, oddAway } = extractWinnerOdds(
      ev,
      marketById,
      oddById,
      homeId,
      awayId,
    );

    const startsAt = new Date(ev.startDate);

    out.push({
      externalId: String(ev.id),
      homeTeam,
      awayTeam,
      competition: champById.get(ev.champId)?.name ?? null,
      startsAt: Number.isNaN(startsAt.getTime()) ? new Date(0) : startsAt,
      oddHome,
      oddDraw,
      oddAway,
      markets: extractMarkets(ev, marketById, oddById),
      deepLink: deepLink(ev.id),
      minute: (ev.liveTime ?? '').trim(),
      homeScore: Number(ev.score?.[0] ?? 0),
      awayScore: Number(ev.score?.[1] ?? 0),
      statusText: (ev.ls ?? '').trim() || 'Ao vivo',
      countryIso: (catById.get(ev.catId)?.iso ?? '').toUpperCase() || null,
      // Crests are attached downstream from the team catalog (provider has none).
      homeLogo: null,
      awayLogo: null,
    });
  }

  return out;
}
