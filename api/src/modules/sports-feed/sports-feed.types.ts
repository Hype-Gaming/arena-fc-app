// api/src/modules/sports-feed/sports-feed.types.ts

/** A fixture normalized away from any specific provider's payload. */
export interface NormalizedEvent {
  /** Provider-scoped event id (kept as a string for stability). */
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  startsAt: Date;
  /** Match-winner (1X2) prices; any may be null if the market is absent. */
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
  /** URL that opens this fixture on the sportsbook. */
  deepLink: string;
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
}

export const SPORTS_FEED_PROVIDER = Symbol('SPORTS_FEED_PROVIDER');
