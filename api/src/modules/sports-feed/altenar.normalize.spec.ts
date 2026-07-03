// api/src/modules/sports-feed/altenar.normalize.spec.ts
import { normalizeAltenar, AltenarRaw } from './altenar.normalize';

const NOW = new Date('2026-07-10T00:00:00Z');
const link = (id: number) => `https://esportiva.bet.br/e/${id}`;

// Mirrors the live shape confirmed against Altenar's GetEvents.
function sample(): AltenarRaw {
  return {
    events: [
      {
        id: 16027580,
        name: 'Botafogo vs. Santos',
        startDate: '2026-07-16T22:30:00Z',
        status: 0,
        competitorIds: [56845, 54850],
        marketIds: [1588971991],
        champId: 11318,
        catId: 593,
      },
    ],
    competitors: [
      { id: 56845, name: 'Botafogo', abbreviation: 'BOT' },
      { id: 54850, name: 'Santos', abbreviation: 'SAN' },
    ],
    markets: [
      {
        id: 1588971991,
        typeId: 1,
        name: 'Vencedor do encontro',
        oddIds: [4049572921, 4049572922, 4049572923],
      },
    ],
    odds: [
      { id: 4049572921, price: 1.9091, name: 'Botafogo', competitorId: 56845 },
      { id: 4049572922, price: 3.4, name: 'Empate' }, // draw: no competitorId
      { id: 4049572923, price: 4.1, name: 'Santos', competitorId: 54850 },
    ],
    champs: [{ id: 11318, name: 'Brasileirão A' }],
  };
}

describe('normalizeAltenar', () => {
  it('maps a prematch event with 1X2 odds, competition and deep link', () => {
    const [ev] = normalizeAltenar(sample(), link, NOW);
    expect(ev).toEqual({
      externalId: '16027580',
      homeTeam: 'Botafogo',
      awayTeam: 'Santos',
      competition: 'Brasileirão A',
      startsAt: new Date('2026-07-16T22:30:00Z'),
      oddHome: 1.9091,
      oddDraw: 3.4,
      oddAway: 4.1,
      deepLink: 'https://esportiva.bet.br/e/16027580',
    });
  });

  it('skips live/started events (status != 0 or already kicked off)', () => {
    const raw = sample();
    raw.events!.push({
      ...raw.events![0],
      id: 2,
      status: 1, // live
    });
    raw.events!.push({
      ...raw.events![0],
      id: 3,
      startDate: '2026-07-01T00:00:00Z', // in the past relative to NOW
    });
    const out = normalizeAltenar(raw, link, NOW);
    expect(out.map((e) => e.externalId)).toEqual(['16027580']);
  });

  it('keeps an event with no 1X2 market, odds null', () => {
    const raw = sample();
    raw.events![0].marketIds = [];
    const [ev] = normalizeAltenar(raw, link, NOW);
    expect(ev.oddHome).toBeNull();
    expect(ev.oddDraw).toBeNull();
    expect(ev.oddAway).toBeNull();
    expect(ev.homeTeam).toBe('Botafogo');
  });

  it('falls back to splitting the event name when competitors are missing', () => {
    const raw = sample();
    raw.competitors = [];
    const [ev] = normalizeAltenar(raw, link, NOW);
    expect(ev.homeTeam).toBe('Botafogo');
    expect(ev.awayTeam).toBe('Santos');
  });

  it('does not clobber the draw price with an unrelated competitor outcome', () => {
    const raw = sample();
    // An extra outcome for a competitor that is neither home nor away.
    raw.markets![0].oddIds.push(4049572999);
    raw.odds!.push({ id: 4049572999, price: 9.9, name: 'Outro', competitorId: 99999 });
    const [ev] = normalizeAltenar(raw, link, NOW);
    expect(ev.oddDraw).toBe(3.4); // still the real draw, not 9.9
    expect(ev.oddHome).toBe(1.9091);
    expect(ev.oddAway).toBe(4.1);
  });

  it('returns [] for an empty payload', () => {
    expect(normalizeAltenar({}, link, NOW)).toEqual([]);
  });
});
