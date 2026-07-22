import { AltenarFeedProvider } from './altenar.provider';

describe('AltenarFeedProvider', () => {
  const OLD_ENV = process.env;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  it('sends the Esportiva browser headers required by the widget feed', async () => {
    await new AltenarFeedProvider().fetchUpcoming();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/GetEvents?');
    expect(url).toContain('integration=esportiva');
    expect(init.headers).toMatchObject({
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      Origin: 'https://esportiva.bet.br',
      Referer: 'https://esportiva.bet.br/sports/soccer/sp-66',
    });
    expect(init.headers['User-Agent']).toContain('Mozilla/5.0');
  });
});
