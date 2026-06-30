// api/src/modules/credits/credits.service.spec.ts
import { CreditsService } from './credits.service';

type MockPrisma = {
  creditTransaction: { findFirst: jest.Mock };
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
};

function makePrisma(): MockPrisma {
  return {
    creditTransaction: { findFirst: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  };
}

describe('CreditsService.getBalance', () => {
  it('returns 0 when the user has no credit transactions', async () => {
    const prisma = makePrisma();
    prisma.creditTransaction.findFirst.mockResolvedValue(null);
    const service = new CreditsService(prisma as any);

    const balance = await service.getBalance('user-1');

    expect(balance).toBe(0);
    expect(prisma.creditTransaction.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
  });

  it('returns the latest balanceAfter when transactions exist', async () => {
    const prisma = makePrisma();
    prisma.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 42 });
    const service = new CreditsService(prisma as any);

    const balance = await service.getBalance('user-1');

    expect(balance).toBe(42);
  });
});
