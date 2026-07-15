// api/src/modules/admin/betslip.parse.ts
import { BadRequestException } from '@nestjs/common';

export interface ParsedSelection {
  eventName: string; // "Botafogo x Santos"
  homeTeam: string;
  awayTeam: string;
  market: string; // "Vencedor do encontro"
  selection: string; // "Botafogo"
  odd: number;
  startsAt: Date | null;
  externalId: string | null;
}

/**
 * Parses the JSON copied from the Esportiva localStorage key
 * `WSDK_esportiva_betSelections`. The Altenar betslip stores an array of
 * selections; field names vary across widget versions, so this reads several
 * aliases defensively and keeps only usable rows.
 */
export function parseBetslip(rawJson: string): ParsedSelection[] {
  let data: unknown;
  try {
    data = JSON.parse(rawJson);
  } catch {
    throw new BadRequestException('Invalid betslip JSON');
  }

  const rows = extractRows(data);
  if (rows.length === 0) {
    throw new BadRequestException('No selections found in the betslip JSON');
  }

  const out: ParsedSelection[] = [];
  for (const row of rows) {
    const parsed = parseRow(row);
    if (parsed) out.push(parsed);
  }
  if (out.length === 0) {
    throw new BadRequestException(
      'Betslip JSON had no selection with an event and odd',
    );
  }
  return out;
}

function extractRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['selections', 'items', 'bets', 'betSelections']) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

function firstString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
}

function firstNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    // Odds must be positive: reject 0/negative from either shape.
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

/** Split at the FIRST home/away separator; the away side keeps any remainder. */
function splitEvent(name: string): [string, string] {
  const m = name.match(/\s+(?:vs\.?|x|—|-)\s+/i);
  if (!m || m.index === undefined) return [name.trim(), ''];
  return [
    name.slice(0, m.index).trim(),
    name.slice(m.index + m[0].length).trim(),
  ];
}

function parseRow(row: Record<string, unknown>): ParsedSelection | null {
  const eventName = firstString(row, [
    'eventName', 'event', 'eventDesc', 'match', 'matchName', 'fixture', 'name',
  ]);
  const odd = firstNumber(row, ['odd', 'price', 'oddValue', 'coefficient', 'rate']);
  if (!eventName || odd === null) return null;

  const [home, away] = splitEvent(eventName);
  // A bilhete is a head-to-head fixture: both sides are required.
  if (!home || !away) return null;
  const market =
    firstString(row, ['marketName', 'market', 'betType', 'marketDesc']) ??
    'Vencedor do encontro';
  const selection =
    firstString(row, ['selectionName', 'selection', 'outcome', 'oddName', 'pick']) ??
    home;

  const startRaw = firstString(row, ['startDate', 'eventDate', 'kickoff', 'date']);
  const startsAt = startRaw ? new Date(startRaw) : null;

  return {
    eventName: `${home} x ${away}`.trim(),
    homeTeam: home,
    awayTeam: away,
    market,
    selection,
    odd,
    startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null,
    externalId: firstId(row, ['eventId', 'extId', 'id', 'externalId']),
  };
}

/** Event ids come as strings or numbers depending on the widget version. */
function firstId(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}
