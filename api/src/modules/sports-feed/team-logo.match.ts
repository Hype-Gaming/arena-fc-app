// api/src/modules/sports-feed/team-logo.match.ts
// Cross-matches a sportsbook team name (Altenar) against our API-Football team
// catalog to attach a crest URL. Conservative on purpose: it only returns a
// logo on a confident match (exact or affix-stripped key). An ambiguous key
// (two different teams collapse to it) yields null, so we never show the WRONG
// crest — the UI just falls back to the initials badge.
import { normalizeText } from '../tipster/match-search.util';

export interface CatalogTeam {
  name: string;
  logoUrl: string;
}

export interface TeamLogoIndex {
  /** normalizeText(name) → logo, only where the name maps to a single logo. */
  byName: Map<string, string>;
  /** affix-stripped key → logo, only where the key is unambiguous. */
  byKey: Map<string, string>;
}

// Generic club affixes and Brazilian state suffixes that differ between the
// sportsbook and the catalog ("Mjällby AIF" vs "Mjallby", "Cuiabá MT" vs
// "Cuiabá"). Kept conservative — words that distinguish clubs (united, city,
// atletico…) are NEVER stripped.
const AFFIXES = new Set([
  'fc', 'cf', 'ec', 'sc', 'afc', 'aif', 'if', 'bk', 'sk', 'sv', 'fk', 'ca',
  'cd', 'ac', 'se', 'calcio', 'futebol', 'futbol', 'club', 'clube',
]);
const BR_STATES = new Set([
  'rj', 'sp', 'mg', 'rs', 'pr', 'ba', 'ce', 'go', 'pe', 'pa', 'am', 'ma',
  'pb', 'rn', 'al', 'es', 'mt', 'ms', 'df', 'to', 'ap', 'ro', 'rr', 'pi',
]);

/** Comparable key: accent/case-folded, punctuation-free, affixes removed. */
export function teamKey(name: string): string {
  const tokens = normalizeText(name)
    .replace(/\./g, '') // "A.C." → "ac" (don't split into a/c)
    .replace(/[-_/]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .filter((t) => !/^\d+$/.test(t)) // drop "1." / "04" club-number tokens
    .filter((t) => !AFFIXES.has(t) && !BR_STATES.has(t));
  return tokens.sort().join(' ');
}

export function buildTeamLogoIndex(teams: CatalogTeam[]): TeamLogoIndex {
  const nameLogos = new Map<string, Set<string>>();
  const keyLogos = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, k: string, logo: string) => {
    if (!k || !logo) return;
    (map.get(k) ?? map.set(k, new Set()).get(k)!).add(logo);
  };

  for (const t of teams) {
    add(nameLogos, normalizeText(t.name), t.logoUrl);
    add(keyLogos, teamKey(t.name), t.logoUrl);
  }

  // Keep only unambiguous keys (exactly one distinct logo).
  const collapse = (map: Map<string, Set<string>>): Map<string, string> => {
    const out = new Map<string, string>();
    for (const [k, logos] of map) if (logos.size === 1) out.set(k, [...logos][0]);
    return out;
  };

  return { byName: collapse(nameLogos), byKey: collapse(keyLogos) };
}

/** Best-effort crest URL for a team name, or null when there's no safe match. */
export function matchTeamLogo(name: string, index: TeamLogoIndex): string | null {
  return index.byName.get(normalizeText(name)) ?? index.byKey.get(teamKey(name)) ?? null;
}
