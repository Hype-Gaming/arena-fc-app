import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, ApiError } from './apiClient';
import { tokenStorage } from './tokenStorage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  beforeEach(() => localStorage.clear());

  it('attaches the bearer token to requests', async () => {
    tokenStorage.setTokens({ accessToken: 'acc', refreshToken: 'ref' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new ApiClient('http://api', fetchMock);

    await client.get('/tips/feed');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api/tips/feed');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer acc',
    );
  });

  it('parses JSON bodies on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: 42 }));
    const client = new ApiClient('http://api', fetchMock);
    const data = await client.get<{ value: number }>('/x');
    expect(data.value).toBe(42);
  });

  it('throws ApiError with status and message on non-2xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'no credits' }, 402));
    const client = new ApiClient('http://api', fetchMock);
    await expect(client.post('/tips/entradas/1/unlock', {})).rejects.toMatchObject(
      { status: 402, message: 'no credits' } satisfies Partial<ApiError>,
    );
  });

  it('refreshes the token once on 401 and retries the request', async () => {
    tokenStorage.setTokens({ accessToken: 'old', refreshToken: 'ref' });
    const fetchMock = vi
      .fn()
      // first protected call -> 401
      .mockResolvedValueOnce(jsonResponse({ message: 'unauthorized' }, 401))
      // refresh call -> new tokens
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'new', refreshToken: 'ref2' }),
      )
      // retry with new token -> ok
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const client = new ApiClient('http://api', fetchMock);

    const data = await client.get<{ ok: boolean }>('/perfil');

    expect(data.ok).toBe(true);
    expect(tokenStorage.getAccessToken()).toBe('new');
    const retryInit = fetchMock.mock.calls[2][1];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer new',
    );
  });
});
