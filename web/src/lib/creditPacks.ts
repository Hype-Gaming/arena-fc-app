// web/src/lib/creditPacks.ts — the "Comprar créditos IA" catalog.
// Display strings live here; each pack maps to a LastLink checkout. The pack
// `id` must match the product's externalProductId seeded in the API
// (api/prisma/seeds/products.seed.ts) so the webhook grants the right thing.
import { CHECKOUT_URL } from './checkout';

const env = import.meta.env as Record<string, string | undefined>;

function nonEmpty(v: string | undefined): string | undefined {
  return v && v.trim() !== '' ? v : undefined;
}

export interface CreditPack {
  id: string;
  name: string;
  /** Small line under the name (credits granted / access window). */
  sub: string;
  priceLabel: string;
  kind: 'credits' | 'unlimited';
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'premier-6-creditos-ia',
    name: 'Arena 6 Creditos IA',
    sub: '6 créditos',
    priceLabel: 'R$ 29,90',
    kind: 'credits',
  },
  {
    id: 'premier-9-creditos-ia',
    name: 'Arena 9 Creditos IA',
    sub: '9 créditos',
    priceLabel: 'R$ 39,90',
    kind: 'credits',
  },
  {
    id: 'premier-ilimitado-1-mes',
    name: 'Arena Crédito IA ilimitado por 1 mês',
    sub: '30 dias ilimitados',
    priceLabel: 'R$ 99,00',
    kind: 'unlimited',
  },
  {
    id: 'premier-ilimitado-3-meses',
    name: 'Arena Crédito IA ilimitado por 3 meses',
    sub: '90 dias ilimitados',
    priceLabel: 'R$ 149,90',
    kind: 'unlimited',
  },
];

/**
 * Hosted checkout for a pack. Prefers a per-pack env override
 * (VITE_CHECKOUT_URL_PREMIER_6_CREDITOS_IA, …); otherwise falls back to the
 * generic checkout tagged with the product id.
 */
export function checkoutUrlForPack(id: string): string {
  const key = `VITE_CHECKOUT_URL_${id.toUpperCase().replace(/-/g, '_')}`;
  return nonEmpty(env[key]) ?? `${CHECKOUT_URL}?produto=${id}`;
}
