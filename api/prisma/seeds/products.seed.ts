import { PrismaClient, GrantType } from '@prisma/client';

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
 * Credit packs are wired here. The "acesso ilimitado" passes are intentionally
 * NOT seeded yet — an unlimited-for-N-days entitlement is not modelled in the
 * schema; add them once that mechanism is decided.
 */
interface ProductSeed {
  provider: string;
  externalProductId: string;
  grantType: GrantType;
  grantCredits?: number;
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
];

/** Idempotently upsert products by their (provider, externalProductId) key. */
export async function seedProducts(
  prisma: Pick<PrismaClient, 'product'>,
): Promise<void> {
  for (const p of PRODUCT_SEEDS) {
    const data = {
      grantType: p.grantType,
      grantCredits: p.grantCredits ?? null,
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
