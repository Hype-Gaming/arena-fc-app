import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersViewService {
  constructor(private readonly prisma: PrismaService) {}

  async listWithBalances() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        level: true,
        xp: true,
        createdAt: true,
      },
    });
    if (users.length === 0) return [];

    // Latest balance per user in a SINGLE query (was N+1). DISTINCT ON + seq
    // DESC uses the strictly-monotonic ledger key, matching CreditsService —
    // ordering by `createdAt` could tie and read a stale balanceAfter.
    const rows = await this.prisma.$queryRaw<
      { userId: string; balanceAfter: number }[]
    >`
      SELECT DISTINCT ON ("userId") "userId", "balanceAfter"
      FROM "CreditTransaction"
      ORDER BY "userId", "seq" DESC
    `;
    const balanceByUser = new Map(rows.map((r) => [r.userId, r.balanceAfter]));

    return users.map((u) => ({ ...u, balance: balanceByUser.get(u.id) ?? 0 }));
  }
}
