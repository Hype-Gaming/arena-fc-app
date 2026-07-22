// api/src/modules/sports-feed/nation-aliases.ts
// The Esportiva feed names national teams in Portuguese ("Suíça", "Alemanha",
// "Coreia do Sul") while API-Football stores and searches them in English
// ("Switzerland", "Germany", "South Korea"). Without this bridge the crest
// fallback (/teams?search=) never resolves a seleção, so World Cup / Euro /
// Copa América fixtures show initials badges instead of flags.
//
// Keys are the accent/case-folded form (normalizeText) of the PT name; values
// are the English name API-Football indexes the national team under. Covers the
// 48 World Cup 2026 nations plus the usual continental-cup entrants.
import { normalizeText } from '../tipster/match-search.util';

const PT_TO_EN: Record<string, string> = {
  // South America
  brasil: 'Brazil',
  argentina: 'Argentina',
  uruguai: 'Uruguay',
  paraguai: 'Paraguay',
  chile: 'Chile',
  colombia: 'Colombia',
  peru: 'Peru',
  equador: 'Ecuador',
  bolivia: 'Bolivia',
  venezuela: 'Venezuela',
  // North / Central America
  'estados unidos': 'USA',
  mexico: 'Mexico',
  canada: 'Canada',
  'costa rica': 'Costa Rica',
  panama: 'Panama',
  honduras: 'Honduras',
  jamaica: 'Jamaica',
  // Europe
  alemanha: 'Germany',
  inglaterra: 'England',
  escocia: 'Scotland',
  'pais de gales': 'Wales',
  franca: 'France',
  espanha: 'Spain',
  italia: 'Italy',
  portugal: 'Portugal',
  'paises baixos': 'Netherlands',
  holanda: 'Netherlands',
  belgica: 'Belgium',
  croacia: 'Croatia',
  suica: 'Switzerland',
  austria: 'Austria',
  dinamarca: 'Denmark',
  suecia: 'Sweden',
  noruega: 'Norway',
  polonia: 'Poland',
  'republica tcheca': 'Czech Republic',
  chequia: 'Czech Republic',
  servia: 'Serbia',
  turquia: 'Turkey',
  ucrania: 'Ukraine',
  grecia: 'Greece',
  hungria: 'Hungary',
  romenia: 'Romania',
  'republica da irlanda': 'Ireland',
  irlanda: 'Ireland',
  // Africa
  marrocos: 'Morocco',
  senegal: 'Senegal',
  tunisia: 'Tunisia',
  argelia: 'Algeria',
  egito: 'Egypt',
  gana: 'Ghana',
  nigeria: 'Nigeria',
  camaroes: 'Cameroon',
  'costa do marfim': 'Ivory Coast',
  'africa do sul': 'South Africa',
  'cabo verde': 'Cape Verde',
  // Asia / Oceania
  japao: 'Japan',
  'coreia do sul': 'South Korea',
  ira: 'Iran',
  'arabia saudita': 'Saudi Arabia',
  catar: 'Qatar',
  qatar: 'Qatar',
  australia: 'Australia',
  'nova zelandia': 'New Zealand',
  uzbequistao: 'Uzbekistan',
  jordania: 'Jordan',
};

/**
 * English name API-Football indexes a national team under, given the feed's
 * Portuguese name — or null when the name isn't a known nation (i.e. it's a
 * club, so the normal search path applies).
 */
export function nationEnglishName(name?: string | null): string | null {
  if (!name) return null;
  return PT_TO_EN[normalizeText(name)] ?? null;
}
