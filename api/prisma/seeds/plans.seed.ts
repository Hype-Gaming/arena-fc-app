import { PrismaClient } from '@prisma/client';

export interface PlanSeed {
  key: 'free' | 'premium';
  name: string;
  /** Cosmetic label shown on the Perfil screen. Adjust to the real price. */
  priceLabel: string;
  /** Monthly credit bonus granted on activation/renewal (spec section 5). */
  monthlyCredits: number;
}

// The two MVP plans (spec section: Assinatura Free / Premium). Premium grants a
// monthly credit bonus; unlocking still always costs credits (they are
// independent). `priceLabel` is display-only — edit to the real published price.
export const PLAN_SEEDS: PlanSeed[] = [
  {
    key: 'free',
    name: 'Free',
    priceLabel: 'Grátis',
    monthlyCredits: 0,
  },
  {
    key: 'premium',
    name: 'Premium',
    priceLabel: 'R$ 29,90/mês',
    monthlyCredits: 50,
  },
];

/**
 * Idempotently upsert the Free/Premium plans by their PlanKey.
 * Subscriptions FK to Plan, and the billing webhook throws "Plan not found"
 * without these rows — so this must run on every deploy / `prisma db seed`.
 */
export async function seedPlans(
  prisma: Pick<PrismaClient, 'plan'>,
): Promise<void> {
  for (const seed of PLAN_SEEDS) {
    await prisma.plan.upsert({
      where: { key: seed.key },
      create: {
        key: seed.key,
        name: seed.name,
        priceLabel: seed.priceLabel,
        monthlyCredits: seed.monthlyCredits,
      },
      update: {
        name: seed.name,
        priceLabel: seed.priceLabel,
        monthlyCredits: seed.monthlyCredits,
      },
    });
  }
}
