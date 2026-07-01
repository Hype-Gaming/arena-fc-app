import { PrismaClient } from '@prisma/client';
import { seedAchievements } from './seeds/achievements.seed';

async function main(prisma: PrismaClient): Promise<void> {
  await seedAchievements(prisma);
}

const prisma = new PrismaClient();

main(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
