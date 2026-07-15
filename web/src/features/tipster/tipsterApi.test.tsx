import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchMatches, analyzeMatch } from './tipsterApi';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

describe('tipsterApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.setItem('accessToken', 'tok123');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('searchMatches calls the encoded query with the bearer token and unwraps matches', async () => {
    (fetch as any).mockReturnValue(okJson({ matches: [{ id: 'm1' }] }));
    const result = await searchMatches('sao paulo');

    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/api/tipster/match-search?q=sao%20paulo');
    expect(init.headers.Authorization).toBe('Bearer tok123');
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('analyzeMatch POSTs the matchId and returns the analysis payload', async () => {
    (fetch as any).mockReturnValue(
      okJson({ sessionId: 's1', message: 'ENTRADA PRINCIPAL...', entradaId: 'e1', balanceAfter: 7 }),
    );
    const result = await analyzeMatch('m1');

    const [url, init] = (fetch as any).mock.calls[0];
    expect(url).toBe('/api/tipster/analyze');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ matchId: 'm1' });
    expect(result.balanceAfter).toBe(7);
  });

  it('analyzeMatch throws a typed error when credits are insufficient (402/400)', async () => {
    (fetch as any).mockReturnValue(
      Promise.resolve({ ok: false, status: 402, json: () => Promise.resolve({ message: 'Insufficient credits' }) } as Response),
    );
    await expect(analyzeMatch('m1')).rejects.toThrow('Insufficient credits');
  });
});
