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
    const result = [];
    for (const u of users) {
      const last = await this.prisma.creditTransaction.findFirst({
        where: { userId: u.id },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      result.push({ ...u, balance: last ? last.balanceAfter : 0 });
    }
    return result;
  }
}
