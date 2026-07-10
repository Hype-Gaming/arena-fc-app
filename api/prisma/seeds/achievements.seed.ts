import { PrismaClient } from '@prisma/client';

export type AchievementCriteria =
  | { type: 'unlock_count'; threshold: number }
  | { type: 'green_count'; threshold: number }
  | { type: 'level_reached'; threshold: number }
  | { type: 'referral_count'; threshold: number }
  | { type: 'login_streak'; threshold: number };

/** Persisted grouping for the Perfil screen (Phase 5). */
export type AchievementCategory = 'permanent' | 'streak' | 'daily';

export interface AchievementSeed {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** Bonus XP granted the moment this achievement unlocks. */
  rewardXp: number;
  criteria: AchievementCriteria;
}

// Seed list for spec section 6 milestones plus the Phase 3 login-streak ladder.
export const ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  {
    key: 'first_unlock',
    name: 'Primeira Entrada',
    description: 'Destrave sua primeira entrada.',
    icon: 'trophy-bronze',
    category: 'permanent',
    rewardXp: 20,
    criteria: { type: 'unlock_count', threshold: 1 },
  },
  {
    key: 'ten_unlocks',
    name: 'Caçador de Tips',
    description: 'Destrave 10 entradas.',
    icon: 'trophy-silver',
    category: 'permanent',
    rewardXp: 40,
    criteria: { type: 'unlock_count', threshold: 10 },
  },
  {
    key: 'fifty_unlocks',
    name: 'Veterano',
    description: 'Destrave 50 entradas.',
    icon: 'trophy-gold',
    category: 'permanent',
    rewardXp: 100,
    criteria: { type: 'unlock_count', threshold: 50 },
  },
  {
    key: 'first_green',
    name: 'Primeiro Green',
    description: 'Tenha sua primeira entrada green.',
    icon: 'star-green',
    category: 'permanent',
    rewardXp: 30,
    criteria: { type: 'green_count', threshold: 1 },
  },
  {
    key: 'ten_greens',
    name: 'Sequência Verde',
    description: 'Acumule 10 entradas green.',
    icon: 'star-gold',
    category: 'permanent',
    rewardXp: 75,
    criteria: { type: 'green_count', threshold: 10 },
  },
  {
    key: 'level_5',
    name: 'Subindo de Nível',
    description: 'Alcance o nível 5.',
    icon: 'badge-level-5',
    category: 'permanent',
    rewardXp: 50,
    criteria: { type: 'level_reached', threshold: 5 },
  },
  {
    key: 'level_10',
    name: 'Elite',
    description: 'Alcance o nível 10.',
    icon: 'badge-level-10',
    category: 'permanent',
    rewardXp: 150,
    criteria: { type: 'level_reached', threshold: 10 },
  },
  {
    key: 'first_referral',
    name: 'Embaixador',
    description: 'Indique seu primeiro amigo.',
    icon: 'handshake',
    category: 'permanent',
    rewardXp: 50,
    criteria: { type: 'referral_count', threshold: 1 },
  },
  // Login-streak ladder (Phase 3): consecutive days opening the app.
  {
    key: 'streak_3',
    name: 'Aquecendo',
    description: 'Acesse o app 3 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 15,
    criteria: { type: 'login_streak', threshold: 3 },
  },
  {
    key: 'streak_7',
    name: 'Uma Semana',
    description: 'Acesse o app 7 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 40,
    criteria: { type: 'login_streak', threshold: 7 },
  },
  {
    key: 'streak_14',
    name: 'Rotina de Craque',
    description: 'Acesse o app 14 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 80,
    criteria: { type: 'login_streak', threshold: 14 },
  },
  {
    key: 'streak_30',
    name: 'Mês Perfeito',
    description: 'Acesse o app 30 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 150,
    criteria: { type: 'login_streak', threshold: 30 },
  },
  {
    key: 'streak_60',
    name: 'Inabalável',
    description: 'Acesse o app 60 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 300,
    criteria: { type: 'login_streak', threshold: 60 },
  },
  {
    key: 'streak_100',
    name: 'Lenda da Constância',
    description: 'Acesse o app 100 dias seguidos.',
    icon: 'flame',
    category: 'streak',
    rewardXp: 500,
    criteria: { type: 'login_streak', threshold: 100 },
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
    const data = {
      name: seed.name,
      description: seed.description,
      icon: seed.icon,
      category: seed.category,
      rewardXp: seed.rewardXp,
      criteria: seed.criteria,
    };
    await prisma.achievement.upsert({
      where: { key: seed.key },
      create: { key: seed.key, ...data },
      update: data,
    });
  }
}
