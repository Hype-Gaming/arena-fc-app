// api/src/modules/admin/esportiva-leagues.ts
// Maps the leagues the Esportiva (Altenar) feed brings to their API-Football
// league ids, so we can pull exactly those teams into the catalog for crests.
// Rules are matched by the competition name (regex) scoped by country ISO3 when
// a name is ambiguous across countries ("Liga 1" = Peru AND Romania; "Série A"
// = Italy while Brazil's is "Brasileirão A").

interface LeagueRule {
  /** ISO-3166 alpha-3 of the competition's country; omit for international. */
  iso?: string;
  name: RegExp;
  league: number;
}

// API-Football v3 league ids.
const LEAGUE_RULES: LeagueRule[] = [
  // International club cups (category "Europa"/"Américas"/"Mundo")
  { name: /champions league/i, league: 2 },
  { name: /europa league/i, league: 3 },
  { name: /conference league/i, league: 848 },
  { name: /libertadores/i, league: 13 },
  { name: /sul[- ]?americana|sudamericana/i, league: 11 },

  // England
  { iso: 'ENG', name: /premier league/i, league: 39 },
  { iso: 'ENG', name: /championship/i, league: 40 },
  { iso: 'ENG', name: /league one/i, league: 41 },
  { iso: 'ENG', name: /league two/i, league: 42 },
  { iso: 'ENG', name: /efl cup|carabao/i, league: 48 },
  { iso: 'ENG', name: /fa cup/i, league: 45 },

  // Top-5 + Portugal / Netherlands
  { iso: 'ESP', name: /laliga|la liga/i, league: 140 },
  { iso: 'ITA', name: /s[ée]rie a/i, league: 135 },
  { iso: 'DEU', name: /bundesliga/i, league: 78 },
  { iso: 'FRA', name: /ligue 1/i, league: 61 },
  { iso: 'NLD', name: /eredivisie/i, league: 88 },
  { iso: 'PRT', name: /primeira liga|liga portugal/i, league: 94 },

  // Brazil
  { iso: 'BRA', name: /brasileir[aã]o a\b|s[ée]rie a/i, league: 71 },
  { iso: 'BRA', name: /brasileir[aã]o b\b|s[ée]rie b/i, league: 72 },
  { iso: 'BRA', name: /brasileir[aã]o c\b|s[ée]rie c/i, league: 75 },
  { iso: 'BRA', name: /copa do brasil/i, league: 73 },

  // Americas
  { iso: 'ARG', name: /liga profissional|liga profesional/i, league: 128 },
  { iso: 'MEX', name: /liga mx/i, league: 262 },
  { iso: 'USA', name: /mls|major league soccer/i, league: 253 },
  { iso: 'PER', name: /liga 1/i, league: 281 },
  { iso: 'URY', name: /primeira divis[aã]o|primera divisi[oó]n/i, league: 268 },
  { iso: 'ECU', name: /ligapro|liga pro/i, league: 242 },
  { iso: 'COL', name: /primera a|liga betplay/i, league: 239 },
  { iso: 'CHL', name: /primera divisi[oó]n/i, league: 265 },

  // Europe (rest) + Asia
  { iso: 'SWE', name: /allsvenskan/i, league: 113 },
  { iso: 'NOR', name: /elite?serien/i, league: 103 },
  { iso: 'ROU', name: /liga 1/i, league: 283 },
  { iso: 'BGR', name: /parva liga|first league/i, league: 172 },
  { iso: 'TUR', name: /s[uü]per lig/i, league: 203 },
  { iso: 'BEL', name: /jupiler|pro league/i, league: 144 },
  { iso: 'SCO', name: /premiership/i, league: 179 },
  { iso: 'CHN', name: /super liga chinesa|super league/i, league: 169 },
  { iso: 'JPN', name: /j1|j.league/i, league: 98 },
  { iso: 'SAU', name: /pro league|saudi/i, league: 307 },
];

/** API-Football league id for an Esportiva competition, or null if unmapped. */
export function resolveLeagueId(
  iso: string | null,
  competition: string | null,
): number | null {
  if (!competition) return null;
  for (const r of LEAGUE_RULES) {
    if (r.iso && r.iso !== iso) continue;
    if (r.name.test(competition)) return r.league;
  }
  return null;
}
