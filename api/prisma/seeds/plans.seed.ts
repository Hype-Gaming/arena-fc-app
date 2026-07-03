import { PrismaClient } from '@prisma/client';

export interface PlanSeed {
  key: 'free' | 'premium' | 'diamante';
  name: string;
  /** Cosmetic label shown on the Perfil/Planos screens. Adjust to the real price. */
  priceLabel: string;
  /** Monthly credit bonus granted on activation/renewal (spec section 5). */
  monthlyCredits: number;
  /** Access ordering: a plan unlocks every bilhete category with minRank <= rank. */
  rank: number;
}

// The three plans (Livre / Premium / Diamante, matching the plan-comparison
// screen). Premium and Diamante grant monthly credit bonuses; unlocking
// entradas still always costs credits (they are independent). `priceLabel` is
// display-only — edit to the real published price.
export const PLAN_SEEDS: PlanSeed[] = [
  {
    key: 'free',
    name: 'Livre',
    priceLabel: 'Grátis',
    monthlyCredits: 0,
    rank: 0,
  },
  {
    key: 'premium',
    name: 'Premium',
    priceLabel: 'R$ 47 VIDA',
    monthlyCredits: 50,
    rank: 1,
  },
  {
    key: 'diamante',
    name: 'Diamante',
    priceLabel: 'R$ 127 VIDA',
    monthlyCredits: 120,
    rank: 2,
  },
];

/**
 * Idempotently upsert the plans by their PlanKey.
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
        rank: seed.rank,
      },
      update: {
        name: seed.name,
        priceLabel: seed.priceLabel,
        monthlyCredits: seed.monthlyCredits,
        rank: seed.rank,
      },
    });
  }
}
