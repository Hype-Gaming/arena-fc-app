import { describe, it, expect } from 'vitest';
import { toggleBasketLeg, combinedOdd, isLegInBasket, type BasketLeg } from './esportivaBasket';

const leg = (over: Partial<BasketLeg> = {}): BasketLeg => ({
  eventExternalId: '16027574',
  homeTeam: 'Corinthians',
  awayTeam: 'Grêmio',
  mercado: '1x2',
  mercadoLabel: 'Resultado Final',
  selecao: 'Corinthians',
  linha: null,
  odd: 1.54,
  oddId: 4049555380,
  ...over,
});

describe('toggleBasketLeg', () => {
  it('adds a leg to an empty basket', () => {
    expect(toggleBasketLeg([], leg())).toHaveLength(1);
  });

  it('removes a leg already present (same event + oddId)', () => {
    const l = leg();
    expect(toggleBasketLeg([l], l)).toEqual([]);
  });

  it('replaces the pick when the same event+market gets a different selection', () => {
    const home = leg();
    const draw = leg({ selecao: 'Empate', oddId: 999, odd: 3.2 });
    const next = toggleBasketLeg([home], draw);
    expect(next).toHaveLength(1);
    expect(next[0].oddId).toBe(999);
  });

  it('keeps legs from different events side by side', () => {
    const a = leg();
    const b = leg({ eventExternalId: '16998999', oddId: 4219529561, odd: 1.75 });
    expect(toggleBasketLeg([a], b)).toHaveLength(2);
  });
});

describe('combinedOdd', () => {
  it('multiplies the leg odds', () => {
    const a = leg({ odd: 1.5 });
    const b = leg({ eventExternalId: '2', oddId: 2, odd: 2 });
    expect(combinedOdd([a, b])).toBeCloseTo(3.0, 5);
  });
  it('is 1 for an empty basket', () => {
    expect(combinedOdd([])).toBe(1);
  });
});

describe('isLegInBasket', () => {
  it('matches on event + oddId', () => {
    expect(isLegInBasket([leg()], '16027574', 4049555380)).toBe(true);
    expect(isLegInBasket([leg()], '16027574', 111)).toBe(false);
  });
});
