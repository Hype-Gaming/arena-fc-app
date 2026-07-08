import {
  PrismaClient,
  GrantType,
  BilheteCategoria,
  PlanKey,
} from '@prisma/client';

/**
 * Payment products the billing webhook resolves to a grant. The gateway
 * (LastLink) sends `externalProductId`; a matching active row here is what
 * turns a paid checkout into credits (or a plan). Without these rows every
 * real webhook is ignored as "No active product".
 *
 * `externalProductId` MUST equal the id LastLink sends for that product — the
 * slugs below are placeholders; set them to the real product ids (or map them
 * in the LastLink adapter) before going live. Display name/price live on the
 * frontend (see web/src/lib/creditPacks.ts); the DB only needs the grant.
 *
 * Credit packs grant a fixed credit amount; the "acesso ilimitado" passes grant
 * an ia_unlimited window of grantPeriodDays (analyses stop consuming credits).
 */
interface ProductSeed {
  provider: string;
  externalProductId: string;
  grantType: GrantType;
  grantCredits?: number;
  grantPlanKey?: PlanKey;
  grantCategory?: BilheteCategoria;
  grantPeriodDays?: number;
}

export const PRODUCT_SEEDS: ProductSeed[] = [
  {
    provider: 'lastlink',
    externalProductId: 'premier-6-creditos-ia',
    grantType: 'credits',
    grantCredits: 6,
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-9-creditos-ia',
    grantType: 'credits',
    grantCredits: 9,
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-ilimitado-1-mes',
    grantType: 'ia_unlimited',
    grantPeriodDays: 30,
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-ilimitado-3-meses',
    grantType: 'ia_unlimited',
    grantPeriodDays: 90,
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-odds-pro-vida',
    grantType: 'category_access',
    grantCategory: 'pro',
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-odds-altas-vida',
    grantType: 'category_access',
    grantCategory: 'ultra',
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-alavancagem-vida',
    grantType: 'category_access',
    grantCategory: 'alavancagem',
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-multiplas-vida',
    grantType: 'category_access',
    grantCategory: 'multiplas',
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-mercado-secundario-vida',
    grantType: 'category_access',
    grantCategory: 'secundario',
  },
  {
    provider: 'lastlink',
    externalProductId: 'premier-ligas-americanas-vida',
    grantType: 'category_access',
    grantCategory: 'ligas',
  },

  // Payt plan products. externalProductId = Payt's `product.code` (the short
  // code shown per product in the Payt admin, and what the PayT V1 postback
  // sends at product.code). Both are lifetime ("VIDA") plans, so
  // grantPeriodDays is null.
  {
    provider: 'payt',
    externalProductId: '4EPO3E', // plano Premium
    grantType: 'plan',
    grantPlanKey: 'premium',
  },
  {
    provider: 'payt',
    externalProductId: 'R229VD', // plano Diamante
    grantType: 'plan',
    grantPlanKey: 'diamante',
  },
];

/** Idempotently upsert products by their (provider, externalProductId) key. */
export async function seedProducts(
  prisma: Pick<PrismaClient, 'product'>,
): Promise<void> {
  for (const p of PRODUCT_SEEDS) {
    const data = {
      grantType: p.grantType,
      grantCredits: p.grantCredits ?? null,
      grantPlanKey: p.grantPlanKey ?? null,
      grantCategory: p.grantCategory ?? null,
      grantPeriodDays: p.grantPeriodDays ?? null,
      active: true,
    };
    await prisma.product.upsert({
      where: {
        provider_externalProductId: {
          provider: p.provider,
          externalProductId: p.externalProductId,
        },
      },
      create: {
        provider: p.provider,
        externalProductId: p.externalProductId,
        ...data,
      },
      update: data,
    });
  }
}
