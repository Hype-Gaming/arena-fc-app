// web/src/features/admin/esportivaBasket.ts
// Pure logic for the admin "cesta": accumulate clicked sportsbook selections,
// dedup, and compute the combined odd. UI lives in AdminBilhetes.tsx.

export interface BasketLeg {
  eventExternalId: string;
  homeTeam: string;
  awayTeam: string;
  mercado: string;
  mercadoLabel: string;
  selecao: string;
  linha: number | null;
  odd: number;
  oddId: number;
}

/**
 * Toggle a leg in the basket:
 *  - clicking the exact same selection (event + oddId) removes it;
 *  - a different selection for the same (event + market) replaces that pick;
 *  - otherwise the leg is appended.
 */
export function toggleBasketLeg(basket: BasketLeg[], leg: BasketLeg): BasketLeg[] {
  const isExact = (l: BasketLeg) =>
    l.eventExternalId === leg.eventExternalId && l.oddId === leg.oddId;
  if (basket.some(isExact)) {
    return basket.filter((l) => !isExact(l));
  }
  const sameMarket = (l: BasketLeg) =>
    l.eventExternalId === leg.eventExternalId && l.mercado === leg.mercado;
  return [...basket.filter((l) => !sameMarket(l)), leg];
}

/** Product of the leg odds (1 for an empty basket). */
export function combinedOdd(basket: BasketLeg[]): number {
  return basket.reduce((acc, l) => acc * l.odd, 1);
}

/** True when this exact selection (event + oddId) is in the basket. */
export function isLegInBasket(
  basket: BasketLeg[],
  eventExternalId: string,
  oddId: number,
): boolean {
  return basket.some(
    (l) => l.eventExternalId === eventExternalId && l.oddId === oddId,
  );
}
