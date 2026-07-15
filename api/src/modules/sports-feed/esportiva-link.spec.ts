import { parseEsportivaEventId } from './esportiva-link';

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
