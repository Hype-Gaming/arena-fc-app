export interface SearchableMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

export function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  return normalized.split(' ').filter((t) => t.length > 0);
}

/**
 * Token-overlap fuzzy score between a query and a match.
 * Each query token that appears as a substring of the match's
 * normalized "home away competition" haystack contributes weight.
 * Whole-token equality with a team word scores higher than a partial.
 */
export function scoreMatch(query: string, match: SearchableMatch): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const haystack = normalizeText(
    `${match.homeTeam} ${match.awayTeam} ${match.competition}`,
  );
  const haystackTokens = new Set(haystack.split(' '));

  let score = 0;
  for (const token of queryTokens) {
    if (haystackTokens.has(token)) {
      score += 2; // exact word hit
    } else if (token.length >= 2 && haystack.includes(token)) {
      score += 1; // partial substring hit
    }
  }
  return score;
}

export function rankMatches<T extends SearchableMatch>(
  query: string,
  matches: T[],
  limit: number,
): T[] {
  return matches
    .map((m) => ({ m, score: scoreMatch(query, m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit))
    .map((x) => x.m);
}
