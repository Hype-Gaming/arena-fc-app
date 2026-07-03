import {
  buildTeamLogoIndex,
  matchTeamLogo,
  teamKey,
} from './team-logo.match';

const L = (n: number) => `https://media.api-sports.io/football/teams/${n}.png`;

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
    { name: 'Mjällby', logoUrl: L(1) },
    { name: 'São Paulo', logoUrl: L(2) },
    { name: 'Manchester United', logoUrl: L(3) },
    { name: 'Manchester City', logoUrl: L(4) },
  ]);

  it('matches an exact (accent-insensitive) name', () => {
    expect(matchTeamLogo('São Paulo', index)).toBe(L(2));
    expect(matchTeamLogo('Sao Paulo', index)).toBe(L(2));
  });

  it('matches across affix/accent differences via the stripped key', () => {
    // sportsbook "Mjallby AIF" → catalog "Mjällby"
    expect(matchTeamLogo('Mjallby AIF', index)).toBe(L(1));
  });

  it('returns null when there is no match', () => {
    expect(matchTeamLogo('Barcelona EC RJ', index)).toBeNull();
  });

  it('returns null for an ambiguous key rather than guess a wrong crest', () => {
    const ambiguous = buildTeamLogoIndex([
      { name: 'Nacional FC', logoUrl: L(10) },
      { name: 'Nacional EC', logoUrl: L(11) }, // both → key "nacional"
    ]);
    expect(matchTeamLogo('Nacional', ambiguous)).toBeNull();
  });

  it('still resolves an exact name even if its key is ambiguous', () => {
    const idx = buildTeamLogoIndex([
      { name: 'Nacional', logoUrl: L(10) },
      { name: 'Nacional EC', logoUrl: L(11) },
    ]);
    expect(matchTeamLogo('Nacional', idx)).toBe(L(10)); // exact name wins
  });
});
