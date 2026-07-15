// api/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Match a user by email (case-insensitive, normalized) or create one.
   * Used by the billing webhook pipeline to identify buyers.
   */
  async findOrCreateByEmail(email: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    try {
      return await this.prisma.user.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
      });
    } catch (err) {
      // Prisma's read-then-create upsert can race when several webhook
      // deliveries create the same buyer simultaneously. The winner commits
      // the user; losers receive P2002 and should reuse that row instead of
      // turning an otherwise idempotent webhook replay into HTTP 500.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalized },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }
}
