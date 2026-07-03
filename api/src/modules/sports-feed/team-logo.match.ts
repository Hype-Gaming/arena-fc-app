// api/src/modules/sports-feed/team-logo.match.ts
// Cross-matches a sportsbook team name (Altenar) against our API-Football team
// catalog. Conservative on purpose: it only resolves on a confident match
// (exact name or affix-stripped key). An ambiguous key (two DIFFERENT teams
// collapse to it) yields null, so we never show the WRONG crest — the UI falls
// back to the initials badge.
import { normalizeText } from '../tipster/match-search.util';
import { countryToIso3 } from './country-iso';

export interface CatalogTeam {
  externalId: number;
  name: string;
  logoUrl: string;
  /** English country name from API-Football (used for the country tiebreak). */
  country?: string | null;
}

/** What a match resolves to: the catalog id (for the cache URL) + source logo. */
export interface TeamLogoRef {
  externalId: number;
  logoUrl: string;
  /** ISO-3166 alpha-3 of the team's country, or null when unknown. */
  countryIso: string | null;
}

export interface TeamLogoIndex {
  byName: Map<string, TeamLogoRef>;
  byKey: Map<string, TeamLogoRef>;
}

// Generic club affixes and Brazilian state suffixes that differ between the
// sportsbook and the catalog ("Mjällby AIF" vs "Mjällby", "Cuiabá MT" vs
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
  // Collect the distinct team ids seen per key; a key with >1 id is ambiguous.
  const nameIds = new Map<string, Map<number, TeamLogoRef>>();
  const keyIds = new Map<string, Map<number, TeamLogoRef>>();
  const add = (
    map: Map<string, Map<number, TeamLogoRef>>,
    k: string,
    t: CatalogTeam,
  ) => {
    if (!k || !t.logoUrl) return;
    const m = map.get(k) ?? map.set(k, new Map()).get(k)!;
    m.set(t.externalId, {
      externalId: t.externalId,
      logoUrl: t.logoUrl,
      countryIso: countryToIso3(t.country),
    });
  };

  for (const t of teams) {
    add(nameIds, normalizeText(t.name), t);
    add(keyIds, teamKey(t.name), t);
  }

  const collapse = (
    map: Map<string, Map<number, TeamLogoRef>>,
  ): Map<string, TeamLogoRef> => {
    const out = new Map<string, TeamLogoRef>();
    for (const [k, ids] of map) {
      if (ids.size === 1) out.set(k, [...ids.values()][0]);
    }
    return out;
  };

  return { byName: collapse(nameIds), byKey: collapse(keyIds) };
}

/**
 * Best-effort crest ref for a team name, or null when there's no safe match.
 * `countryIso` (from the live event) breaks generic single-word collisions:
 * an affix-stripped key match whose team is from a different country is
 * rejected (e.g. "Barcelona EC RJ" [BRA] won't take Spain's Barcelona).
 * An exact full-name match is trusted regardless of country.
 */
export function matchTeamLogo(
  name: string,
  index: TeamLogoIndex,
  countryIso?: string | null,
): TeamLogoRef | null {
  const exact = index.byName.get(normalizeText(name));
  if (exact) return exact;

  const keyed = index.byKey.get(teamKey(name));
  if (!keyed) return null;
  if (countryIso && keyed.countryIso && countryIso !== keyed.countryIso) {
    return null; // same name, different country → don't guess a wrong crest
  }
  return keyed;
}
