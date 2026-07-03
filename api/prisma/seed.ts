import { PrismaClient } from '@prisma/client';
import { seedAchievements } from './seeds/achievements.seed';
import { seedPlans } from './seeds/plans.seed';
import { seedProducts } from './seeds/products.seed';
import { seedBilhetes } from './seeds/bilhetes.seed';

async function main(prisma: PrismaClient): Promise<void> {
  await seedPlans(prisma);
  await seedAchievements(prisma);
  await seedProducts(prisma);
  await seedBilhetes(prisma);
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
