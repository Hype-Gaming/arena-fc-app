import { PrismaClient } from '@prisma/client';

export type AchievementCriteria =
  | { type: 'unlock_count'; threshold: number }
  | { type: 'green_count'; threshold: number }
  | { type: 'level_reached'; threshold: number }
  | { type: 'referral_count'; threshold: number };

export interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  criteria: AchievementCriteria;
}

// Seed list for spec section 6 milestones: 1st entrada, 10 entradas, 1st green, etc.
export const ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  {
    key: 'first_unlock',
    name: 'Primeira Entrada',
    description: 'Destrave sua primeira entrada.',
    icon: 'trophy-bronze',
    criteria: { type: 'unlock_count', threshold: 1 },
  },
  {
    key: 'ten_unlocks',
    name: 'Caçador de Tips',
    description: 'Destrave 10 entradas.',
    icon: 'trophy-silver',
    criteria: { type: 'unlock_count', threshold: 10 },
  },
  {
    key: 'fifty_unlocks',
    name: 'Veterano',
    description: 'Destrave 50 entradas.',
    icon: 'trophy-gold',
    criteria: { type: 'unlock_count', threshold: 50 },
  },
  {
    key: 'first_green',
    name: 'Primeiro Green',
    description: 'Tenha sua primeira entrada green.',
    icon: 'star-green',
    criteria: { type: 'green_count', threshold: 1 },
  },
  {
    key: 'ten_greens',
    name: 'Sequência Verde',
    description: 'Acumule 10 entradas green.',
    icon: 'star-gold',
    criteria: { type: 'green_count', threshold: 10 },
  },
  {
    key: 'level_5',
    name: 'Subindo de Nível',
    description: 'Alcance o nível 5.',
    icon: 'badge-level-5',
    criteria: { type: 'level_reached', threshold: 5 },
  },
  {
    key: 'level_10',
    name: 'Elite',
    description: 'Alcance o nível 10.',
    icon: 'badge-level-10',
    criteria: { type: 'level_reached', threshold: 10 },
  },
  {
    key: 'first_referral',
    name: 'Embaixador',
    description: 'Indique seu primeiro amigo.',
    icon: 'handshake',
    criteria: { type: 'referral_count', threshold: 1 },
  },
];

/**
 * Idempotently upsert every achievement by its unique `key`.
 * Safe to run repeatedly (deploys / `prisma db seed`).
 */
export async function seedAchievements(
  prisma: Pick<PrismaClient, 'achievement'>,
): Promise<void> {
  for (const seed of ACHIEVEMENT_SEEDS) {
    await prisma.achievement.upsert({
      where: { key: seed.key },
      create: {
        key: seed.key,
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        criteria: seed.criteria,
      },
      update: {
        name: seed.name,
        description: seed.description,
        icon: seed.icon,
        criteria: seed.criteria,
      },
    });
  }
}
