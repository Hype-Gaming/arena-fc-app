// api/test/credits.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { CreditsModule } from '../src/modules/credits/credits.module';
import { CreditsService } from '../src/modules/credits/credits.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { InsufficientCreditsError } from '../src/modules/credits/errors';

describe('Credits ledger (e2e)', () => {
  let prisma: PrismaService;
  let credits: CreditsService;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CreditsModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    credits = moduleRef.get(CreditsService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.creditTransaction.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'ledger-e2e@test.local' } });
    const user = await prisma.user.create({
      data: { email: 'ledger-e2e@test.local' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.creditTransaction.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'ledger-e2e@test.local' } });
    await prisma.$disconnect();
  });

  it('returns 0 for an empty ledger', async () => {
    expect(await credits.getBalance(userId)).toBe(0);
  });

  it('accumulates a running balance and persists balanceAfter', async () => {
    await credits.applyTransaction({ userId, type: 'grant', amount: 30 });
    await credits.applyTransaction({ userId, type: 'purchase', amount: 20, refType: 'product', refId: 'p1' });
    const spend = await credits.applyTransaction({ userId, type: 'unlock', amount: -10, refType: 'entrada', refId: 'e1' });

    expect(spend.balanceAfter).toBe(40);
    expect(await credits.getBalance(userId)).toBe(40);

    const rows = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, balanceAfter: true },
    });
    expect(rows.map((r) => r.balanceAfter)).toEqual([30, 50, 40]);
  });

  it('rejects an unlock that would overdraw and writes no row', async () => {
    await credits.applyTransaction({ userId, type: 'grant', amount: 5 });

    await expect(
      credits.applyTransaction({ userId, type: 'unlock', amount: -10, refType: 'entrada', refId: 'e2' }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);

    expect(await credits.getBalance(userId)).toBe(5);
    const count = await prisma.creditTransaction.count({ where: { userId } });
    expect(count).toBe(1);
  });
});
