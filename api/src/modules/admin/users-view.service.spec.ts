import { UsersViewService } from './users-view.service';

describe('UsersViewService', () => {
  let prisma: any;
  let service: UsersViewService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn() },
      creditTransaction: { findFirst: jest.fn() },
    };
    service = new UsersViewService(prisma);
  });

  it('returns each user with a derived balance from the latest ledger row', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', role: 'user', level: 2, xp: 50, createdAt: new Date(0) },
      { id: 'u2', email: 'b@x.com', role: 'admin', level: 1, xp: 0, createdAt: new Date(0) },
    ]);
    prisma.creditTransaction.findFirst
      .mockResolvedValueOnce({ balanceAfter: 30 })
      .mockResolvedValueOnce(null);

    const res = await service.listWithBalances();

    expect(prisma.creditTransaction.findFirst).toHaveBeenNthCalledWith(1, {
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    expect(res).toEqual([
      {
        id: 'u1',
        email: 'a@x.com',
        role: 'user',
        level: 2,
        xp: 50,
        createdAt: new Date(0),
        balance: 30,
      },
      {
        id: 'u2',
        email: 'b@x.com',
        role: 'admin',
        level: 1,
        xp: 0,
        createdAt: new Date(0),
        balance: 0,
      },
    ]);
  });
});
