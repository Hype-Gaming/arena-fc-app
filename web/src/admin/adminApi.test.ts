import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi } from './adminApi';

describe('adminApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('accessToken', 'tok123');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('lists categories with the bearer token', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'c1', name: 'Futebol' }],
    });
    const res = await adminApi.listCategories();
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/categories',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      }),
    );
    expect(res).toEqual([{ id: 'c1', name: 'Futebol' }]);
  });

  it('marks an entrada green via PATCH', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'e1', status: 'green' }) });
    const res = await adminApi.setEntradaResult('e1', 'green');
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/entradas/e1/result',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ result: 'green' }),
      }),
    );
    expect(res.status).toBe('green');
  });

  it('throws on a non-ok response', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
    await expect(adminApi.listCategories()).rejects.toThrow('Request failed: 403');
  });
});
