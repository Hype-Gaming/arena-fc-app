export interface TipsterMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startsAt: string;
  status: string;
}

export interface AnalyzeResponse {
  sessionId: string;
  message: string;
  entradaId: string | null;
  balanceAfter: number;
}

export interface LiveMatch {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  minute: string;
  homeScore: number;
  awayScore: number;
  statusText: string;
  oddHome: number | null;
  oddDraw: number | null;
  oddAway: number | null;
  deepLink: string;
  /** Licensed crest URLs when a logo source is wired; absent → initials badge. */
  homeLogo?: string | null;
  awayLogo?: string | null;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      (body as { message?: string }).message ?? `Request failed (${res.status})`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

interface FeedShape {
  categories: {
    matches: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      competition: string;
      startsAt: string;
      status: string;
    }[];
  }[];
}

/** Upcoming scheduled matches for the empty-state suggestions (soonest first). */
export async function upcomingMatches(limit = 5): Promise<TipsterMatch[]> {
  const res = await fetch('/api/tips/feed', {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  const body = await unwrap<FeedShape>(res);
  return body.categories
    .flatMap((c) => c.matches)
    .filter((m) => m.status === 'scheduled')
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, limit);
}

export async function searchMatches(q: string): Promise<TipsterMatch[]> {
  const res = await fetch(`/api/tipster/match-search?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  const body = await unwrap<{ matches: TipsterMatch[] }>(res);
  return body.matches;
}

export async function analyzeMatch(matchId: string): Promise<AnalyzeResponse> {
  const res = await fetch('/api/tipster/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ matchId }),
  });
  return unwrap<AnalyzeResponse>(res);
}

/** Matches in play right now (from the sportsbook feed). */
export async function liveMatches(): Promise<LiveMatch[]> {
  const res = await fetch('/api/tipster/live', {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  const body = await unwrap<{ matches: LiveMatch[] }>(res);
  return body.matches;
}

export async function analyzeLive(externalId: string): Promise<AnalyzeResponse> {
  const res = await fetch('/api/tipster/analyze-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ externalId }),
  });
  return unwrap<AnalyzeResponse>(res);
}
