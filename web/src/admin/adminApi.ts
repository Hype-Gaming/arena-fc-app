/** Exchange the refresh token for a fresh access token. Returns false if it
 *  can't (no/expired refresh token → the user must log in again). */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const t = (await res.json()) as { accessToken: string; refreshToken: string };
  localStorage.setItem('accessToken', t.accessToken);
  localStorage.setItem('refreshToken', t.refreshToken);
  return true;
}

async function req<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  // Access tokens are short-lived — silently refresh once and retry so a long
  // admin session doesn't 401 on every action.
  if (res.status === 401 && retry && (await refreshTokens())) {
    return req<T>(path, init, false);
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Category { id: string; name: string; slug: string; icon: string; }
export interface Entrada { id: string; status: 'pending' | 'green' | 'red'; }

export type BilheteCategoria =
  | 'safes' | 'pro' | 'ultra' | 'alavancagem' | 'multiplas' | 'secundario' | 'ligas';

export interface AdminBilhete {
  id: string;
  titulo: string;
  categoria: BilheteCategoria;
  homeTeam: string;
  awayTeam: string;
  homeColor: string | null;
  awayColor: string | null;
  competition: string | null;
  startsAt: string;
  odd: string | number;
  resultado: 'pending' | 'green' | 'red';
  publishedAt: string | null;
}

export interface CreateBilheteInput {
  titulo?: string;
  categoria: BilheteCategoria;
  homeTeam: string;
  awayTeam: string;
  homeColor?: string;
  awayColor?: string;
  homeLogo?: string;
  awayLogo?: string;
  competition?: string;
  startsAt: string;
  odd: number;
  eventDeepLink?: string;
  eventExternalId?: string;
  publish?: boolean;
}

export interface SportEvent {
  id: string;
  provider: string;
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  startsAt: string;
  oddHome: string | number | null;
  oddDraw: string | number | null;
  oddAway: string | number | null;
  deepLink: string;
}

export interface SportEventSyncSummary {
  provider: string;
  fetched: number;
  upserted: number;
}

export interface Team {
  id: string;
  externalId: number;
  name: string;
  code: string | null;
  country: string | null;
  logoUrl: string;
}

export interface TeamSyncSummary {
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
  skippedForCap: number;
}

export interface EsportivaLeagueSyncSummary {
  leaguesInFeed: number;
  synced: number;
  failed: number;
  teamsUpserted: number;
  skippedForCap: number;
  unmapped: string[];
}

export const adminApi = {
  listCategories: () => req<Category[]>('/admin/categories'),
  createCategory: (data: { name: string; slug: string; icon: string }) =>
    req<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  listMatches: () => req<any[]>('/admin/matches'),
  createMatch: (data: unknown) =>
    req('/admin/matches', { method: 'POST', body: JSON.stringify(data) }),
  listEntradas: (matchId: string) => req<Entrada[]>(`/admin/entradas?matchId=${matchId}`),
  createEntrada: (data: unknown) =>
    req('/admin/entradas', { method: 'POST', body: JSON.stringify(data) }),
  setEntradaResult: (id: string, result: 'green' | 'red') =>
    req<Entrada>(`/admin/entradas/${id}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ result }),
    }),
  listProducts: () => req<any[]>('/admin/products'),
  createProduct: (data: unknown) =>
    req('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  listUsers: () => req<any[]>('/admin/users'),
  listBilhetes: () => req<AdminBilhete[]>('/admin/bilhetes'),
  createBilhete: (data: CreateBilheteInput) =>
    req<AdminBilhete>('/admin/bilhetes', { method: 'POST', body: JSON.stringify(data) }),
  setBilheteResult: (id: string, resultado: 'pending' | 'green' | 'red') =>
    req<AdminBilhete>(`/admin/bilhetes/${id}/result`, {
      method: 'PATCH',
      body: JSON.stringify({ resultado }),
    }),
  setBilhetePublished: (id: string, published: boolean) =>
    req<AdminBilhete>(`/admin/bilhetes/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ published }),
    }),
  deleteBilhete: (id: string) =>
    req(`/admin/bilhetes/${id}`, { method: 'DELETE' }),
  listTeams: (q?: string) =>
    req<Team[]>(`/admin/teams${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  syncTeams: (data: { league?: number; season?: number } = {}) =>
    req<TeamSyncSummary>('/admin/teams/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  syncLiveLogos: () =>
    req<LiveLogoSyncSummary>('/admin/teams/sync-live-logos', { method: 'POST' }),
  syncEsportivaLeagues: () =>
    req<EsportivaLeagueSyncSummary>('/admin/teams/sync-esportiva-leagues', {
      method: 'POST',
    }),
  listSportEvents: (q?: string) =>
    req<SportEvent[]>(`/admin/sport-events${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  syncSportEvents: () =>
    req<SportEventSyncSummary>('/admin/sport-events/sync', { method: 'POST' }),
  importBetslip: (data: { json: string; categoria: BilheteCategoria; publish?: boolean }) =>
    req<{ imported: number }>('/admin/bilhetes/import-betslip', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createBilhetesFromEvents: (data: { categoria?: BilheteCategoria; limit?: number } = {}) =>
    req<{ created: number; withCrest: number; availableEvents: number }>(
      '/admin/bilhetes/from-events',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  publishTutorial: (steps: { title: string; body: string; imageUrl?: string }[]) =>
    req('/tutorial/versions', { method: 'POST', body: JSON.stringify({ steps }) }),
};
