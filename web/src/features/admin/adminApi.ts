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

// The backoffice password, kept in memory only (never persisted) so admin
// sessions can be silently recreated while the tab is open, without ever
// writing the password to storage. Lost on reload — the admin re-enters it if
// their (30-min) admin token has also expired.
let adminPassword: string | null = null;

function clearAdminSession(): void {
  localStorage.removeItem('adminAccessToken');
}

async function createAdminSession(retry = true): Promise<boolean> {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  const res = await fetch('/api/auth/admin/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(adminPassword != null ? { password: adminPassword } : {}),
  });
  if (res.status === 401 && retry && (await refreshTokens())) {
    return createAdminSession(false);
  }
  if (!res.ok) {
    clearAdminSession();
    throw new Error(`Request failed: ${res.status}`);
  }

  const session = (await res.json()) as { adminAccessToken: string };
  localStorage.setItem('adminAccessToken', session.adminAccessToken);
  return true;
}

async function req<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const doFetch = (): Promise<Response> =>
    fetch(`/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('accessToken')
          ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          : {}),
        ...(localStorage.getItem('adminAccessToken')
          ? { 'X-Admin-Session': `Bearer ${localStorage.getItem('adminAccessToken')}` }
          : {}),
        ...(init?.headers ?? {}),
      },
    });

  let res = await doFetch();

  if (res.status === 401 && retry) {
    // Most 401s are just an expired access token: refresh and retry first,
    // leaving the independent (longer-lived) admin session token untouched.
    if (await refreshTokens()) res = await doFetch();
    // Still 401 → the admin session itself is stale. Recreate it (using the
    // in-memory panel password) and retry once more.
    if (res.status === 401) {
      clearAdminSession();
      if (await createAdminSession(false)) res = await doFetch();
    }
  }

  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  // Some endpoints (e.g. DELETE) reply 204/200 with an empty body — calling
  // res.json() on that throws "Unexpected end of JSON input", which used to make
  // deletes look like they failed. Tolerate an empty body and return undefined.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface Category { id: string; name: string; slug: string; icon: string; }
export interface Entrada { id: string; status: 'pending' | 'green' | 'red'; }

export type BilheteCategoria =
  | 'safes' | 'pro' | 'ultra' | 'alavancagem' | 'multiplas' | 'secundario' | 'ligas';

export interface SportSelection {
  label: string;
  odd: number;
  line: number | null;
}

export interface SportMarket {
  typeId: number;
  key: string;
  name: string;
  selections: SportSelection[];
}

export interface AdminBilhete {
  id: string;
  titulo: string;
  categoria: BilheteCategoria;
  mercado: string | null;
  selecao: string | null;
  linha: string | number | null;
  homeTeam: string;
  awayTeam: string;
  homeColor: string | null;
  awayColor: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  competition: string | null;
  startsAt: string;
  validUntil: string | null;
  odd: string | number;
  resultado: 'pending' | 'green' | 'red';
  publishedAt: string | null;
  createdAt: string;
  esportivaShareUrl: string | null;
  legs: BilheteLeg[];
}

export interface BilheteLeg {
  homeTeam: string;
  awayTeam: string;
  mercado: string;
  selecao: string;
  linha: string | number | null;
  odd: string | number;
}

export interface CreateBilheteInput {
  titulo?: string;
  categoria: BilheteCategoria;
  mercado?: string;
  selecao?: string;
  linha?: number;
  homeTeam: string;
  awayTeam: string;
  homeColor?: string;
  awayColor?: string;
  homeLogo?: string;
  awayLogo?: string;
  competition?: string;
  startsAt: string;
  validUntil?: string;
  odd: number;
  eventDeepLink?: string;
  eventExternalId?: string;
  esportivaShareUrl?: string;
  legs?: {
    homeTeam: string;
    awayTeam: string;
    mercado: string;
    selecao: string;
    linha?: number;
    odd: number;
  }[];
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
  markets: SportMarket[] | null;
  deepLink: string;
}

export interface SportEventSyncSummary {
  provider: string;
  fetched: number;
  upserted: number;
}

/** One event previewed from a pasted Esportiva link: card + popular markets. */
export interface EventPreview {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  competition: string | null;
  countryIso: string | null;
  startsAt: string;
  deepLink: string;
  markets: SportMarket[];
  homeLogo: string | null;
  awayLogo: string | null;
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

export interface NationalTeamSyncSummary {
  competitions: number;
  synced: number;
  failed: number;
  teamsUpserted: number;
}

export const adminApi = {
  // Pass the panel password on the first (interactive) call; later calls reuse
  // the cached admin token or the in-memory password. A still-valid admin token
  // in storage lets a reload skip the prompt.
  ensureAdminSession: (password?: string) => {
    if (password !== undefined) adminPassword = password;
    return localStorage.getItem('adminAccessToken')
      ? Promise.resolve(true)
      : createAdminSession();
  },
  clearAdminSession,
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
  updateBilhete: (id: string, data: Partial<CreateBilheteInput>) =>
    req<AdminBilhete>(`/admin/bilhetes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
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
  syncNationalTeams: () =>
    req<NationalTeamSyncSummary>('/admin/teams/sync-national-teams', {
      method: 'POST',
    }),
  listSportEvents: (q?: string) =>
    req<SportEvent[]>(`/admin/sport-events${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  syncSportEvents: () =>
    req<SportEventSyncSummary>('/admin/sport-events/sync', { method: 'POST' }),
  previewEvent: (ref: string) =>
    req<EventPreview>(`/admin/sport-events/preview?ref=${encodeURIComponent(ref)}`),
  resolveTeamLogo: (name: string, iso?: string) =>
    req<{ logo: string | null }>(
      `/admin/teams/resolve-logo?name=${encodeURIComponent(name)}${iso ? `&iso=${iso}` : ''}`,
    ),
  importBetslip: (data: { json: string; categoria: BilheteCategoria; publish?: boolean }) =>
    req<{ imported: number }>('/admin/bilhetes/import-betslip', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createBilhetesFromEvents: (
    data: {
      categoria?: BilheteCategoria;
      mercado?: string;
      limit?: number;
      eventExternalIds?: string[];
      eventPicks?: {
        eventExternalId: string;
        mercado?: string;
        selecao?: string;
        linha?: number | null;
      }[];
    } = {},
  ) =>
    req<{ created: number; withCrest: number; availableEvents: number }>(
      '/admin/bilhetes/from-events',
      { method: 'POST', body: JSON.stringify(data) },
    ),
  publishTutorial: (steps: { title: string; body: string; imageUrl?: string }[]) =>
    req('/tutorial/versions', { method: 'POST', body: JSON.stringify({ steps }) }),
};
