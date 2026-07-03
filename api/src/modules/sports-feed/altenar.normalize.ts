// api/src/modules/sports-feed/altenar.normalize.ts
import { NormalizedEvent, NormalizedLiveEvent } from './sports-feed.types';

/** Subset of Altenar's GetEvents payload we rely on (confirmed against live data). */
export interface AltenarRaw {
  events?: AltenarEvent[];
  competitors?: { id: number; name: string; abbreviation?: string }[];
  markets?: { id: number; typeId: number; name: string; oddIds: number[] }[];
  odds?: { id: number; price: number; name: string; competitorId?: number }[];
  champs?: { id: number; name: string }[];
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

type AltenarMarket = NonNullable<AltenarRaw['markets']>[number];
type AltenarOdd = NonNullable<AltenarRaw['odds']>[number];

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
      startsAt,
      oddHome,
      oddDraw,
      oddAway,
      deepLink: deepLink(ev.id),
    });
  }

  // Soonest first.
  out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return out;
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
      deepLink: deepLink(ev.id),
      minute: (ev.liveTime ?? '').trim(),
      homeScore: Number(ev.score?.[0] ?? 0),
      awayScore: Number(ev.score?.[1] ?? 0),
      statusText: (ev.ls ?? '').trim() || 'Ao vivo',
      // Crests are attached downstream from the team catalog (provider has none).
      homeLogo: null,
      awayLogo: null,
    });
  }

  return out;
}
