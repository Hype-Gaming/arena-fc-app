import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi } from './adminApi';

/** A minimal stand-in for a fetch Response: req() reads status + text(). */
function mockResponse(body: unknown, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  };
}

describe('adminApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('accessToken', 'tok123');
    localStorage.setItem('adminAccessToken', 'admin123');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('lists categories with the bearer token', async () => {
    (fetch as any).mockResolvedValue(mockResponse([{ id: 'c1', name: 'Futebol' }]));
    const res = await adminApi.listCategories();
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/categories',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok123',
          'X-Admin-Session': 'Bearer admin123',
        }),
      }),
    );
    expect(res).toEqual([{ id: 'c1', name: 'Futebol' }]);
  });

  it('marks an entrada green via PATCH', async () => {
    (fetch as any).mockResolvedValue(mockResponse({ id: 'e1', status: 'green' }));
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

  it('deletes a bilhete even when the response body is empty', async () => {
    // DELETE replies 200/204 with no body — res.json() would throw, so req()
    // must tolerate an empty body instead of rejecting.
    (fetch as any).mockResolvedValue(mockResponse(undefined, { status: 200 }));
    await expect(adminApi.deleteBilhete('b1')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/bilhetes/b1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on a non-ok response', async () => {
    (fetch as any).mockResolvedValue(mockResponse({}, { ok: false, status: 403 }));
    await expect(adminApi.listCategories()).rejects.toThrow('Request failed: 403');
  });

  it('creates a separate admin session when needed', async () => {
    localStorage.removeItem('adminAccessToken');
    (fetch as any).mockResolvedValue(
      mockResponse({ adminAccessToken: 'new-admin-token', expiresInSeconds: 1800 }),
    );

    await expect(adminApi.ensureAdminSession()).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/admin/session',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      }),
    );
    expect(localStorage.getItem('adminAccessToken')).toBe('new-admin-token');
  });
});
