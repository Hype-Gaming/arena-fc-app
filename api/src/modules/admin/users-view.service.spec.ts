import { UsersViewService } from './users-view.service';

describe('UsersViewService', () => {
  let prisma: any;
  let service: UsersViewService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    service = new UsersViewService(prisma);
  });

  it('returns each user with a derived balance from the latest ledger row', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', role: 'user', level: 2, xp: 50, createdAt: new Date(0) },
      { id: 'u2', email: 'b@x.com', role: 'admin', level: 1, xp: 0, createdAt: new Date(0) },
    ]);
    // Single DISTINCT ON query: u1 has a ledger row, u2 has none (→ 0).
    prisma.$queryRaw.mockResolvedValue([{ userId: 'u1', balanceAfter: 30 }]);

    const res = await service.listWithBalances();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
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
