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
  publishTutorial: (steps: { title: string; body: string; imageUrl?: string }[]) =>
    req('/tutorial/versions', { method: 'POST', body: JSON.stringify({ steps }) }),
};
