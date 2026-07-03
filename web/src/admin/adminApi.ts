async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
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
  competition?: string;
  startsAt: string;
  odd: number;
  publish?: boolean;
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
  publishTutorial: (steps: { title: string; body: string; imageUrl?: string }[]) =>
    req('/tutorial/versions', { method: 'POST', body: JSON.stringify({ steps }) }),
};
