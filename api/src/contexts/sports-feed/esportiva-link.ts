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
