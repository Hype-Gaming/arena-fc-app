import {
  buildTeamLogoIndex,
  matchTeamLogo,
  teamKey,
  type CatalogTeam,
} from './team-logo.match';

const L = (n: number) => `https://media.api-sports.io/football/teams/${n}.png`;
const team = (externalId: number, name: string): CatalogTeam => ({
  externalId,
  name,
  logoUrl: L(externalId),
});

describe('teamKey', () => {
  it('folds accents/case and strips club affixes + BR state suffixes', () => {
    expect(teamKey('Mjällby AIF')).toBe('mjallby');
    expect(teamKey('Cuiabá MT')).toBe('cuiaba');
    expect(teamKey('São Paulo FC')).toBe('paulo sao'); // sorted tokens
    expect(teamKey('A.C. Milan')).toBe('milan');
  });

  it('keeps distinguishing words (never collapses United vs City)', () => {
    expect(teamKey('Manchester United')).not.toBe(teamKey('Manchester City'));
  });

  it('drops club-number tokens so "1. FC Monheim" ~ "Monheim"', () => {
    expect(teamKey('1. FC Monheim')).toBe(teamKey('Monheim'));
    expect(teamKey('Fortuna Dusseldorf')).toBe(teamKey('Fortuna Düsseldorf'));
  });
});

describe('matchTeamLogo', () => {
  const index = buildTeamLogoIndex([
    team(1, 'Mjällby'),
    team(2, 'São Paulo'),
    team(3, 'Manchester United'),
    team(4, 'Manchester City'),
  ]);

  it('matches an exact (accent-insensitive) name', () => {
    expect(matchTeamLogo('Sao Paulo', index)).toEqual({ externalId: 2, logoUrl: L(2) });
  });

  it('matches across affix/accent differences via the stripped key', () => {
    expect(matchTeamLogo('Mjallby AIF', index)).toEqual({ externalId: 1, logoUrl: L(1) });
  });

  it('returns null when there is no match', () => {
    expect(matchTeamLogo('Barcelona EC RJ', index)).toBeNull();
  });

  it('returns null for an ambiguous key rather than guess a wrong crest', () => {
    const ambiguous = buildTeamLogoIndex([team(10, 'Nacional FC'), team(11, 'Nacional EC')]);
    expect(matchTeamLogo('Nacional', ambiguous)).toBeNull();
  });

  it('still resolves an exact name even if its key is ambiguous', () => {
    const idx = buildTeamLogoIndex([team(10, 'Nacional'), team(11, 'Nacional EC')]);
    expect(matchTeamLogo('Nacional', idx)).toEqual({ externalId: 10, logoUrl: L(10) });
  });
});
