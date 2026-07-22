import { resolveLeagueId } from './esportiva-leagues';

describe('resolveLeagueId', () => {
  it('maps well-known leagues to API-Football ids', () => {
    expect(resolveLeagueId('ENG', 'Premier League')).toBe(39);
    expect(resolveLeagueId('ESP', 'LaLiga')).toBe(140);
    expect(resolveLeagueId('DEU', 'Bundesliga')).toBe(78);
    expect(resolveLeagueId('BRA', 'Brasileirão A')).toBe(71);
    expect(resolveLeagueId('BRA', 'Brasileirão B')).toBe(72);
  });

  it('maps international cups without a country', () => {
    expect(resolveLeagueId('Europa', 'Champions League')).toBe(2);
    expect(resolveLeagueId(null, 'Libertadores')).toBe(13);
  });

  it('disambiguates "Liga 1" (Peru vs Romania) by country', () => {
    expect(resolveLeagueId('PER', 'Liga 1')).toBe(281);
    expect(resolveLeagueId('ROU', 'Liga 1')).toBe(283);
  });

  it('disambiguates "Série A" (Italy) from Brazil', () => {
    expect(resolveLeagueId('ITA', 'Série A')).toBe(135);
    expect(resolveLeagueId('BRA', 'Série A')).toBe(71); // Brazil rule wins for BRA
  });

  it('returns null for an unmapped competition', () => {
    expect(resolveLeagueId('XXX', 'Some Amateur Cup')).toBeNull();
    expect(resolveLeagueId(null, null)).toBeNull();
  });
});
