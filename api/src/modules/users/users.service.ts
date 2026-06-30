// api/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
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
    return this.prisma.user.upsert({
      where: { email: normalized },
      update: {},
      create: { email: normalized },
    });
  }
}
