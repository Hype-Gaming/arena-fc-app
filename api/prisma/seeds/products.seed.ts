import {
  PrismaClient,
  GrantType,
  BilheteCategoria,
  PlanKey,
} from '@prisma/client';

/**
 * Payment products the billing webhook resolves to a grant. The gateway sends
 * `externalProductId`; a matching active row here is what turns a paid checkout
 * into credits, plan access, category access, or IA unlimited access.
 *
 * For Payt, `externalProductId` must equal the `product.code` sent in the
 * postback.
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
    provider: 'payt',
    externalProductId: 'RK3OXZ',
    grantType: 'credits',
    grantCredits: 5,
  },
  {
    provider: 'payt',
    externalProductId: 'LPG2YX',
    grantType: 'credits',
    grantCredits: 10,
  },
  {
    provider: 'payt',
    externalProductId: 'L9QZVZ',
    grantType: 'ia_unlimited',
    grantPeriodDays: 30,
  },
  {
    provider: 'payt',
    externalProductId: '4O26Q9',
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

  // Payt plan products. externalProductId = Payt's `product.code` from the V1
  // postback. Both are lifetime ("VIDA") plans, so grantPeriodDays is null.
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
