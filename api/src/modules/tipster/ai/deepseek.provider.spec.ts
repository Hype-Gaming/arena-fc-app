// api/src/modules/tipster/ai/deepseek.provider.spec.ts
import { BadGatewayException } from '@nestjs/common';
import { DeepSeekAnalysisProvider, buildUserPrompt } from './deepseek.provider';
import { AnalysisInput } from './ai-analysis.types';

const INPUT: AnalysisInput = {
  homeTeam: 'Flamengo',
  awayTeam: 'Palmeiras',
  competition: 'Brasileirão',
  candidates: [
    { id: 'e1', market: 'Resultado Final', selection: 'Casa', odd: 1.9, justification: 'Mandante forte.' },
    { id: 'e2', market: 'Total de Gols', selection: 'Mais de 2.5', odd: 1.85, justification: 'Ataques abertos.' },
  ],
};

describe('DeepSeekAnalysisProvider', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...OLD_ENV, DEEPSEEK_API_KEY: 'sk-test' };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('posts to the chat-completions endpoint with the key and returns the content', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '🎯 ENTRADA PRINCIPAL\nCasa @ 1.90' } }],
        }),
    });

    const out = await new DeepSeekAnalysisProvider().analyze(INPUT);

    expect(out).toContain('ENTRADA PRINCIPAL');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    const payload = JSON.parse(init.body);
    expect(payload.model).toBe('deepseek-chat');
    expect(payload.messages[0].role).toBe('system');
    // the vetted markets are handed to the model in the user turn
    expect(payload.messages[1].content).toContain('Resultado Final');
    expect(payload.messages[1].content).toContain('odd 1.90');
  });

  it('honours DEEPSEEK_MODEL and DEEPSEEK_BASE_URL overrides', async () => {
    process.env.DEEPSEEK_MODEL = 'deepseek-reasoner';
    process.env.DEEPSEEK_BASE_URL = 'https://proxy.example.com/v1';
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });

    await new DeepSeekAnalysisProvider().analyze(INPUT);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/v1/chat/completions');
    expect(JSON.parse(init.body).model).toBe('deepseek-reasoner');
  });

  it('throws 502 on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'rate limited' } }),
    });
    await expect(new DeepSeekAnalysisProvider().analyze(INPUT)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws 502 on an empty completion', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '   ' } }] }),
    });
    await expect(new DeepSeekAnalysisProvider().analyze(INPUT)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws 502 when the network is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    await expect(new DeepSeekAnalysisProvider().analyze(INPUT)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('throws when the key is missing (misconfiguration guard)', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    await expect(new DeepSeekAnalysisProvider().analyze(INPUT)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

describe('buildUserPrompt', () => {
  it('lists every candidate and never invents markets', () => {
    const p = buildUserPrompt(INPUT);
    expect(p).toContain('Flamengo x Palmeiras');
    expect(p).toContain('Total de Gols');
    expect(p).toContain('não invente outros');
  });

  it('includes live context when present', () => {
    const p = buildUserPrompt({
      ...INPUT,
      live: { minute: 32, homeScore: 1, awayScore: 0, status: 'First Half' },
    });
    expect(p).toContain("AO VIVO");
    expect(p).toContain("32'");
    expect(p).toContain('1x0');
  });
});
