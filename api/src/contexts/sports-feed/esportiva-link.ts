// api/src/modules/sports-feed/esportiva-link.ts
// Pull the Altenar event id out of whatever the admin pastes: a full Esportiva
// match URL, the "le-<id>" slug, or the bare id.
//   https://esportiva.bet.br/sports/futebol/mundo/.../suica-vs-colombia/le-16993776
//   le-16993776
//   16993776

/** Event id from a pasted link/slug/id, or null when none can be found. */
export function parseEsportivaEventId(
  input: string | null | undefined,
): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^\d+$/.test(s)) return s;

  // Preferred: the "le-<id>" event slug the site puts at the end of the path.
  const le = s.match(/\ble-?(\d{4,})\b/i);
  if (le) return le[1];

  // Fallback: the last long number anywhere in the string.
  const nums = s.match(/\d{4,}/g);
  return nums ? nums[nums.length - 1] : null;
}

/** Default affiliate base for the pre-filled bet-slip link (env-overridable). */
const SELECTIONS_BASE_DEFAULT = 'https://go.aff.esportiva.bet/nwxez5q1';

/** Affiliate base used for generated Esportiva selection links. */
export function esportivaSelectionsBaseUrl(): string {
  return process.env.ESPORTIVA_SELECTIONS_BASE_URL?.trim() || SELECTIONS_BASE_DEFAULT;
}

/**
 * Build the Esportiva `?selections=` deep-link that opens the bet slip
 * pre-filled. Each pair is `{eventId}-{oddId}`; multiple pairs are comma-joined
 * with LITERAL commas (the verified working format). Returns null when there is
 * no valid pair. The affiliate lives in `ESPORTIVA_SELECTIONS_BASE_URL`.
 */
export function buildEsportivaSelectionsUrl(
  pairs: { eventId: string; oddId: string | number }[],
): string | null {
  const valid = pairs.filter(
    (p) => !!p.eventId && /^[1-9]\d*$/.test(String(p.oddId)),
  );
  if (valid.length === 0) return null;
  const base = esportivaSelectionsBaseUrl();
  const sel = valid.map((p) => `${p.eventId}-${p.oddId}`).join(',');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}selections=${sel}`;
}
