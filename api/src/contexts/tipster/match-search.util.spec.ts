import { normalizeText, scoreMatch, rankMatches } from './match-search.util';

type SearchableMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
};

const sample: SearchableMatch[] = [
  { id: 'm1', homeTeam: 'São Paulo', awayTeam: 'Palmeiras', competition: 'Brasileirão' },
  { id: 'm2', homeTeam: 'Flamengo', awayTeam: 'Vasco', competition: 'Carioca' },
  { id: 'm3', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', competition: 'La Liga' },
];

describe('normalizeText', () => {
  it('lowercases, strips accents and collapses whitespace', () => {
    expect(normalizeText('  São   PAULO ')).toBe('sao paulo');
  });

  it('returns empty string for nullish input', () => {
    expect(normalizeText(undefined as unknown as string)).toBe('');
  });
});

describe('scoreMatch', () => {
  it('gives a high score for an exact team-name substring (accent-insensitive)', () => {
    const score = scoreMatch('sao paulo', sample[0]);
    expect(score).toBeGreaterThan(0);
  });

  it('scores a non-matching query as 0', () => {
    expect(scoreMatch('chelsea arsenal', sample[0])).toBe(0);
  });

  it('ranks a full "home vs away" query above a single-team partial', () => {
    const full = scoreMatch('sao paulo palmeiras', sample[0]);
    const partial = scoreMatch('sao', sample[0]);
    expect(full).toBeGreaterThan(partial);
  });
});

describe('rankMatches', () => {
  it('returns only matches with a positive score, best first', () => {
    const result = rankMatches('real barcelona', sample, 10);
    expect(result.map((m) => m.id)).toEqual(['m3']);
  });

  it('respects the limit', () => {
    const result = rankMatches('a', sample, 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(rankMatches('cricket world cup', sample, 10)).toEqual([]);
  });
});
