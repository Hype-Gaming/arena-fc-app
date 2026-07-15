// api/src/modules/admin/betslip.parse.spec.ts
import { BadRequestException } from '@nestjs/common';
import { parseBetslip } from './betslip.parse';

describe('parseBetslip', () => {
  it('parses an array of Altenar-style selections', () => {
    const json = JSON.stringify([
      {
        eventName: 'Botafogo vs. Santos',
        marketName: 'Vencedor do encontro',
        selectionName: 'Botafogo',
        odd: 1.91,
        startDate: '2026-07-16T22:30:00Z',
        eventId: 16027580,
      },
    ]);
    const [s] = parseBetslip(json);
    expect(s).toEqual({
      eventName: 'Botafogo x Santos',
      homeTeam: 'Botafogo',
      awayTeam: 'Santos',
      market: 'Vencedor do encontro',
      selection: 'Botafogo',
      odd: 1.91,
      startsAt: new Date('2026-07-16T22:30:00Z'),
      externalId: '16027580',
    });
  });

  it('reads selections nested under a wrapper key and comma decimals', () => {
    const json = JSON.stringify({
      selections: [
        { match: 'Flamengo x Palmeiras', price: '2,10', selection: 'Empate' },
      ],
    });
    const [s] = parseBetslip(json);
    expect(s.homeTeam).toBe('Flamengo');
    expect(s.awayTeam).toBe('Palmeiras');
    expect(s.odd).toBe(2.1);
    expect(s.market).toBe('Vencedor do encontro'); // defaulted
    expect(s.selection).toBe('Empate');
  });

  it('drops rows without an event or a usable odd', () => {
    const json = JSON.stringify([
      { eventName: 'A vs B', odd: 1.5 },
      { eventName: 'C vs D' }, // no odd
      { odd: 2 }, // no event
    ]);
    expect(parseBetslip(json)).toHaveLength(1);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBetslip('{not json')).toThrow(BadRequestException);
  });

  it('throws when there are no selections at all', () => {
    expect(() => parseBetslip('[]')).toThrow(BadRequestException);
  });

  it('throws when no row has both an event and an odd', () => {
    const json = JSON.stringify([{ eventName: 'A vs B' }]);
    expect(() => parseBetslip(json)).toThrow(BadRequestException);
  });

  it('rejects zero/negative odds', () => {
    const json = JSON.stringify([
      { eventName: 'A vs B', odd: 0 },
      { eventName: 'C vs D', price: -1.5 },
    ]);
    expect(() => parseBetslip(json)).toThrow(BadRequestException);
  });

  it('drops a selection whose event name has no home/away separator', () => {
    const json = JSON.stringify([
      { eventName: 'Final da Copa', odd: 1.8 },
      { eventName: 'A vs B', odd: 1.5 },
    ]);
    const out = parseBetslip(json);
    expect(out).toHaveLength(1);
    expect(out[0].homeTeam).toBe('A');
  });

  it('keeps the remainder on the away side (splits at the first separator only)', () => {
    const json = JSON.stringify([
      { eventName: 'Real Madrid vs. Barcelona', odd: 2 },
    ]);
    const [s] = parseBetslip(json);
    expect(s.homeTeam).toBe('Real Madrid');
    expect(s.awayTeam).toBe('Barcelona');
  });
});
