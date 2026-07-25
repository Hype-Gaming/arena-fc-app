// api/src/modules/sports-feed/sports-feed.types.ts

/** One pickable outcome inside a market, with its decimal price. */
export interface NormalizedSelection {
  /** Provider label as bettors see it, e.g. "Mais de 2.5", "Empate", "Sim". */
  label: string;
  /** Decimal price. Suspended legs (price <= 0) are dropped, so this is > 0. */
  odd: number;
  /** Goal/handicap line when the market carries one (Over/Under), else null. */
  line: number | null;
  /** Altenar odd id — the `{oddId}` half of the `?selections=` deep-link pair. */
  oddId: number;
}

/**
 * A betting market on an event (1X2, Over/Under, BTTS, …) with its outcomes.
 * The feed offers many; we keep only the core few the admin can build from.
 */
export interface NormalizedMarket {
  /** Altenar market typeId — 1 (1X2), 18, 10, 11, 29. */
  typeId: number;
  /** Stable slug: "1x2" | "over_under" | "double_chance" | "dnb" | "btts". */
  key: string;
  /** Provider market name, e.g. "Total de gols". */
  name: string;
  selections: NormalizedSelection[];
}

/** A fixture normalized away from any specific provider's payload. */
export interface NormalizedEvent {
  /** Provider-scoped event id (kept as a string for stability). */
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  /** ISO-3166 alpha-3 of the competition's country (null for international). */
  countryIso: string | null;
  startsAt: Date;
  /** Match-winner (1X2) prices; any may be null if the market is absent. */
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
  /** Core markets (1X2, Over/Under, Double chance, DNB, BTTS) with live odds. */
  markets: NormalizedMarket[];
  /** URL that opens this fixture on the sportsbook. */
  deepLink: string;
}

/**
 * A single event's full preview: identity + kickoff + the popular markets
 * board, built from GetEventDetails so the admin can paste a link and see the
 * card before creating a bilhete. Crests are attached downstream from the
 * catalog (homeLogo/awayLogo), same as the live feed.
 */
export interface NormalizedEventPreview {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  countryIso: string | null;
  startsAt: Date;
  deepLink: string;
  markets: NormalizedMarket[];
}

/** A live (in-play) fixture: the fixture plus its current state. */
export interface NormalizedLiveEvent extends NormalizedEvent {
  /** Elapsed-time label as the book shows it, e.g. "25'". */
  minute: string;
  homeScore: number;
  awayScore: number;
  /** Human status label, e.g. "1ª parte" / "Intervalo". */
  statusText: string;
  /** Crest URLs cross-matched from the team catalog; null when unmatched. */
  homeLogo: string | null;
  awayLogo: string | null;
}

/**
 * A sportsbook fixtures+odds source. Altenar/Esportiva today; the official
 * Esportiva endpoint later — swap the binding in SportsFeedModule, nothing
 * downstream changes.
 */
export interface SportsFeedProvider {
  /** Stable slug stored on SportEvent.provider (e.g. "altenar"). */
  readonly name: string;
  /** Upcoming prematch soccer events with 1X2 odds and deep links. */
  fetchUpcoming(): Promise<NormalizedEvent[]>;
  /** Soccer matches in play right now, with score/minute and 1X2 odds. */
  fetchLive(): Promise<NormalizedLiveEvent[]>;
  /** One event's identity, kickoff and popular markets board (paste-a-link). */
  fetchEventPreview(eventId: string): Promise<NormalizedEventPreview>;
}

export const SPORTS_FEED_PROVIDER = Symbol('SPORTS_FEED_PROVIDER');
