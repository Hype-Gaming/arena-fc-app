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
  entradaId: string;
  balanceAfter: number;
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
