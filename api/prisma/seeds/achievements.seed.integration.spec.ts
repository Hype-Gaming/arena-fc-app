import { PrismaClient } from '@prisma/client';
import { seedAchievements, ACHIEVEMENT_SEEDS } from './achievements.seed';

describe('seedAchievements (integration)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('is idempotent: running twice yields exactly one row per key', async () => {
    await prisma.userAchievement.deleteMany();
    await prisma.achievement.deleteMany();

    await seedAchievements(prisma);
    await seedAchievements(prisma);

    const rows = await prisma.achievement.findMany();
    expect(rows).toHaveLength(ACHIEVEMENT_SEEDS.length);
    const first = await prisma.achievement.findUnique({
      where: { key: 'first_unlock' },
    });
    expect(first).not.toBeNull();
    expect(first!.criteria).toEqual({ type: 'unlock_count', threshold: 1 });
  });
});
