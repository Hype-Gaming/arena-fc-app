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

describe('CreditsService.applyTransaction', () => {
  type Tx = {
    creditTransaction: { findFirst: jest.Mock; create: jest.Mock };
    $executeRaw: jest.Mock;
  };

  function makeTxPrisma() {
    const tx: Tx = {
      creditTransaction: { findFirst: jest.fn(), create: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      creditTransaction: { findFirst: jest.fn() },
      $transaction: jest.fn((cb: (t: Tx) => unknown) => cb(tx)),
    };
    return { prisma, tx };
  }

  it('computes balanceAfter from current balance and inserts the row inside the tx', async () => {
    const { prisma, tx } = makeTxPrisma();
    tx.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 30 });
    tx.creditTransaction.create.mockImplementation(({ data }: any) => ({
      id: 'ct-1',
      createdAt: new Date('2026-06-30T00:00:00Z'),
      ...data,
    }));
    const service = new CreditsService(prisma as any);

    const result = await service.applyTransaction({
      userId: 'user-1',
      type: 'purchase',
      amount: 20,
      refType: 'product',
      refId: 'prod-9',
    });

    expect(result.balanceAfter).toBe(50);
    expect(result.amount).toBe(20);
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'purchase',
        amount: 20,
        balanceAfter: 50,
        refType: 'product',
        refId: 'prod-9',
      },
    });
  });

  it('treats an empty ledger as balance 0 for a positive grant', async () => {
    const { prisma, tx } = makeTxPrisma();
    tx.creditTransaction.findFirst.mockResolvedValue(null);
    tx.creditTransaction.create.mockImplementation(({ data }: any) => ({
      id: 'ct-2',
      createdAt: new Date(),
      ...data,
    }));
    const service = new CreditsService(prisma as any);

    const result = await service.applyTransaction({
      userId: 'user-1',
      type: 'grant',
      amount: 15,
    });

    expect(result.balanceAfter).toBe(15);
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'grant',
        amount: 15,
        balanceAfter: 15,
        refType: null,
        refId: null,
      },
    });
  });

  it('takes a per-user advisory lock before reading the balance', async () => {
    const { prisma, tx } = makeTxPrisma();
    tx.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 10 });
    tx.creditTransaction.create.mockImplementation(({ data }: any) => ({ id: 'x', createdAt: new Date(), ...data }));
    const service = new CreditsService(prisma as any);

    await service.applyTransaction({ userId: 'user-1', type: 'grant', amount: 1 });

    expect(tx.$executeRaw).toHaveBeenCalled();
    // lock acquired before the read
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.creditTransaction.findFirst.mock.invocationCallOrder[0],
    );
  });

  it('reuses a caller-provided tx instead of opening its own transaction', async () => {
    const { prisma, tx } = makeTxPrisma();
    tx.creditTransaction.findFirst.mockResolvedValue({ balanceAfter: 5 });
    tx.creditTransaction.create.mockImplementation(({ data }: any) => ({ id: 'y', createdAt: new Date(), ...data }));
    const service = new CreditsService(prisma as any);

    const result = await service.applyTransaction(
      { userId: 'user-1', type: 'unlock', amount: -5, refType: 'entrada', refId: 'e1' },
      tx as any,
    );

    expect(result.balanceAfter).toBe(0);
    // Did NOT open a nested transaction; used the supplied tx directly.
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', type: 'unlock', amount: -5, balanceAfter: 0, refType: 'entrada', refId: 'e1' },
    });
  });
});
