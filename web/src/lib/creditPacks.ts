// web/src/lib/creditPacks.ts - "Comprar creditos IA" catalog.
// Display strings and hosted checkout URLs live here. The Payt product code
// that grants the purchase is seeded in api/prisma/seeds/products.seed.ts.
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

const PAYT_CHECKOUT_BY_PACK: Record<string, string> = {
  'payt-5-creditos-ia': 'https://checkout.payt.com.br/923698894ed467828da8395f46da1b67',
  'payt-10-creditos-ia': 'https://checkout.payt.com.br/b9308e657ab39f0059e6207c2fbf6aee',
  'payt-ia-ilimitada-30-dias': 'https://checkout.payt.com.br/0c3a47a281c93d17be29146da83fb7c0',
  'payt-ia-ilimitada-90-dias': 'https://checkout.payt.com.br/9b8dcbba1f508de4d63dece33b2b5bde',
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'payt-5-creditos-ia',
    name: 'Arena 5 Creditos IA',
    sub: '5 creditos',
    priceLabel: 'Comprar',
    kind: 'credits',
  },
  {
    id: 'payt-10-creditos-ia',
    name: 'Arena 10 Creditos IA',
    sub: '10 creditos',
    priceLabel: 'Comprar',
    kind: 'credits',
  },
  {
    id: 'payt-ia-ilimitada-30-dias',
    name: 'Arena IA ilimitada por 30 dias',
    sub: '30 dias ilimitados',
    priceLabel: 'Comprar',
    kind: 'unlimited',
  },
  {
    id: 'payt-ia-ilimitada-90-dias',
    name: 'Arena IA ilimitada por 90 dias',
    sub: '90 dias ilimitados',
    priceLabel: 'Comprar',
    kind: 'unlimited',
  },
];

/**
 * Hosted checkout for a pack. Prefers a per-pack env override
 * (VITE_CHECKOUT_URL_PAYT_5_CREDITOS_IA, ...); otherwise uses the Payt
 * checkout configured above and finally falls back to the generic checkout.
 */
export function checkoutUrlForPack(id: string): string {
  const key = `VITE_CHECKOUT_URL_${id.toUpperCase().replace(/-/g, '_')}`;
  return nonEmpty(env[key]) ?? PAYT_CHECKOUT_BY_PACK[id] ?? `${CHECKOUT_URL}?produto=${id}`;
}
