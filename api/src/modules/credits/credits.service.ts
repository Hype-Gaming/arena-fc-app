// api/src/modules/credits/credits.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma, CreditTransaction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyTransactionInput } from './credits.types';
import { InsufficientCreditsError } from './errors';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const latest = await this.prisma.creditTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    return latest?.balanceAfter ?? 0;
  }

  /**
   * The ONLY writer of CreditTransaction.
   *
   * Serializes per-user via a transaction-scoped advisory lock so concurrent
   * writers cannot both read the same "latest" row and double-spend.
   *
   * `tx` is the SECOND positional arg (not a field of `input`): callers that
   * need atomicity with their own write (e.g. an EntradaUnlock insert) pass
   * their active Prisma transaction client and we run inside it. When omitted,
   * we open our own interactive transaction.
   */
  async applyTransaction(
    input: ApplyTransactionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CreditTransaction> {
    if (tx) {
      return this.run(input, tx);
    }
    return this.prisma.$transaction((t) => this.run(input, t));
  }

  private async run(
    input: ApplyTransactionInput,
    tx: Prisma.TransactionClient,
  ): Promise<CreditTransaction> {
    const { userId, type, amount, refType = null, refId = null } = input;

    // Per-user advisory lock, released automatically at tx end. Acquired BEFORE
    // the read so concurrent writers serialize and each sees the committed
    // latest balanceAfter.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;

    const latest = await tx.creditTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    const current = latest?.balanceAfter ?? 0;
    const balanceAfter = current + amount;

    if (balanceAfter < 0) {
      throw new InsufficientCreditsError(userId, current, amount);
    }

    return tx.creditTransaction.create({
      data: { userId, type, amount, balanceAfter, refType, refId },
    });
  }
}
