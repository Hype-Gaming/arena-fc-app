import { BadRequestException } from '@nestjs/common';
import { validateEsportivaShareUrl, buildBilheteShareUrl } from './bilhete-share';

describe('validateEsportivaShareUrl', () => {
  it('accepts a shareCode url on esportiva.bet.br', () => {
    const u = 'https://esportiva.bet.br/sports?shareCode=HC9FF9K16D1';
    expect(validateEsportivaShareUrl(u)).toBe(u);
  });

  it('accepts a selections url on the affiliate host', () => {
    const u = 'https://go.aff.esportiva.bet/nwxez5q1?selections=1-2,3-4';
    expect(validateEsportivaShareUrl(u)).toBe(u);
  });

  it('accepts the configured affiliate base for selections links', () => {
    const old = process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    process.env.ESPORTIVA_SELECTIONS_BASE_URL = 'https://affiliate.example/campaign';
    try {
      expect(validateEsportivaShareUrl('https://affiliate.example/campaign?selections=1-2'))
        .toBe('https://affiliate.example/campaign?selections=1-2');
    } finally {
      if (old === undefined) delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
      else process.env.ESPORTIVA_SELECTIONS_BASE_URL = old;
    }
  });

  it('rejects http and urls with neither shareCode nor selections', () => {
    expect(() => validateEsportivaShareUrl('http://esportiva.bet.br?shareCode=x')).toThrow(
      BadRequestException,
    );
    expect(() => validateEsportivaShareUrl('https://esportiva.bet.br/sports')).toThrow(
      BadRequestException,
    );
    expect(() => validateEsportivaShareUrl('not a url')).toThrow(BadRequestException);
  });
});

describe('buildBilheteShareUrl', () => {
  const OLD = process.env.ESPORTIVA_SELECTIONS_BASE_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    else process.env.ESPORTIVA_SELECTIONS_BASE_URL = OLD;
  });

  it('builds a múltipla url when every leg has event + oddId', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    const url = buildBilheteShareUrl({
      legs: [
        { homeTeam: 'A', awayTeam: 'B', mercado: '1x2', selecao: 'A', odd: 1.5, eventExternalId: '16027574', oddId: '4049555380' },
        { homeTeam: 'C', awayTeam: 'D', mercado: '1x2', selecao: 'C', odd: 1.8, eventExternalId: '16998999', oddId: '4219529561' },
      ],
    });
    expect(url).toBe(
      'https://go.aff.esportiva.bet/nwxez5q1?selections=16027574-4049555380,16998999-4219529561',
    );
  });

  it('builds a single url from top-level event + oddId', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(
      buildBilheteShareUrl({ eventExternalId: '16998999', oddId: '4219529561' }),
    ).toBe('https://go.aff.esportiva.bet/nwxez5q1?selections=16998999-4219529561');
  });

  it('returns null when a leg is missing its oddId', () => {
    expect(
      buildBilheteShareUrl({
        legs: [{ homeTeam: 'A', awayTeam: 'B', mercado: '1x2', selecao: 'A', odd: 1.5 }],
      }),
    ).toBeNull();
  });

  it('returns null when there is nothing to build from', () => {
    expect(buildBilheteShareUrl({})).toBeNull();
  });
});
