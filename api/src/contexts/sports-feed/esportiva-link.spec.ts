import {
  parseEsportivaEventId,
  buildEsportivaSelectionsUrl,
} from './esportiva-link';

describe('parseEsportivaEventId', () => {
  it('pulls the id from a full match URL', () => {
    expect(
      parseEsportivaEventId(
        'https://esportiva.bet.br/sports/futebol/mundo/copa-do-mundo-2026/suica-vs-colombia/le-16993776',
      ),
    ).toBe('16993776');
  });

  it('accepts the le-<id> slug and the bare id', () => {
    expect(parseEsportivaEventId('le-16993776')).toBe('16993776');
    expect(parseEsportivaEventId('16993776')).toBe('16993776');
    expect(parseEsportivaEventId('  16993776 ')).toBe('16993776');
  });

  it('falls back to the last long number in the path', () => {
    expect(
      parseEsportivaEventId('https://esportiva.bet.br/sports/?bt-path=%2Fevent%2F16993776'),
    ).toBe('16993776');
  });

  it('returns null when there is no id', () => {
    expect(parseEsportivaEventId('not a link')).toBeNull();
    expect(parseEsportivaEventId('')).toBeNull();
    expect(parseEsportivaEventId(null)).toBeNull();
  });
});

describe('buildEsportivaSelectionsUrl', () => {
  const OLD = process.env.ESPORTIVA_SELECTIONS_BASE_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    else process.env.ESPORTIVA_SELECTIONS_BASE_URL = OLD;
  });

  it('builds a single-leg url with the default affiliate base', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(buildEsportivaSelectionsUrl([{ eventId: '16998999', oddId: 4219529561 }]))
      .toBe('https://go.aff.esportiva.bet/nwxez5q1?selections=16998999-4219529561');
  });

  it('comma-joins multiple legs with literal commas', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(
      buildEsportivaSelectionsUrl([
        { eventId: '16027574', oddId: 4049555380 },
        { eventId: '16998999', oddId: 4219529561 },
      ]),
    ).toBe(
      'https://go.aff.esportiva.bet/nwxez5q1?selections=16027574-4049555380,16998999-4219529561',
    );
  });

  it('honours a custom base and appends with & when it already has a query', () => {
    process.env.ESPORTIVA_SELECTIONS_BASE_URL =
      'https://go.aff.esportiva.bet/abc?utm_campaign=x';
    expect(buildEsportivaSelectionsUrl([{ eventId: '1', oddId: 2 }])).toBe(
      'https://go.aff.esportiva.bet/abc?utm_campaign=x&selections=1-2',
    );
  });

  it('drops invalid pairs and returns null when none remain', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(buildEsportivaSelectionsUrl([])).toBeNull();
    expect(buildEsportivaSelectionsUrl([{ eventId: '', oddId: 5 }])).toBeNull();
    expect(buildEsportivaSelectionsUrl([{ eventId: '1', oddId: 0 }])).toBeNull();
  });
});
