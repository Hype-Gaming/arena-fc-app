import {
  buildTeamLogoIndex,
  matchTeamLogo,
  teamKey,
  type CatalogTeam,
} from './team-logo.match';

const L = (n: number) => `https://media.api-sports.io/football/teams/${n}.png`;
const team = (
  externalId: number,
  name: string,
  country?: string,
): CatalogTeam => ({ externalId, name, logoUrl: L(externalId), country });
const ref = (n: number, countryIso: string | null = null) => ({
  externalId: n,
  logoUrl: L(n),
  countryIso,
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
    expect(matchTeamLogo('Sao Paulo', index)).toEqual(ref(2));
  });

  it('matches across affix/accent differences via the stripped key', () => {
    expect(matchTeamLogo('Mjallby AIF', index)).toEqual(ref(1));
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
    expect(matchTeamLogo('Nacional', idx)).toEqual(ref(10, null));
  });

  it('resolves a seleção via its English alias (Suíça → Switzerland)', () => {
    const idx = buildTeamLogoIndex([team(100, 'Switzerland'), team(101, 'Colombia')]);
    // The feed sends the Portuguese name; the catalog holds the English one.
    expect(matchTeamLogo('Suíça', idx)).toEqual(ref(100));
    expect(matchTeamLogo('Colômbia', idx)).toEqual(ref(101));
    // A club with no alias still falls through to null.
    expect(matchTeamLogo('Grêmio', idx)).toBeNull();
  });

  it('rejects a key match from a different country (Barcelona BRA ≠ Spain)', () => {
    const idx = buildTeamLogoIndex([team(20, 'Barcelona', 'Spain')]);
    // A Brazilian "Barcelona EC RJ" (BRA) must NOT take Spain's Barcelona.
    expect(matchTeamLogo('Barcelona EC RJ', idx, 'BRA')).toBeNull();
    // Same event country (ESP) → it resolves.
    expect(matchTeamLogo('Barcelona', idx, 'ESP')).toEqual(ref(20, 'ESP'));
    // No country context → name-only behaviour (resolves).
    expect(matchTeamLogo('Barcelona', idx)).toEqual(ref(20, 'ESP'));
  });
});
