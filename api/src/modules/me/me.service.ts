import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

export type PlanKeyValue = 'free' | 'premium' | 'diamante';
const TELEGRAM_UNLOCK_WAIT_SECONDS = 10 * 60;
const TELEGRAM_UNLOCK_PLAN: PlanKeyValue = 'diamante';

/** Human-facing plan names keyed by the PlanKey enum. */
const PLAN_NAMES: Record<PlanKeyValue, string> = {
  free: 'Livre',
  premium: 'Premium',
  diamante: 'Diamante',
};

export interface MeProfile {
  email: string;
  planKey: PlanKeyValue;
  planName: string;
  creditBalance: number;
  /** Active "acesso ilimitado" pass — analyses don't consume credits. */
  iaUnlimited: boolean;
  /** When the unlimited pass expires (ISO), or null if none. */
  iaUnlimitedUntil: string | null;
}

export interface TelegramUnlockStatus {
  startedAt: string | null;
  claimAt: string | null;
  unlockedAt: string | null;
  remainingSeconds: number;
  eligible: boolean;
  planKey: PlanKeyValue;
}

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async getProfile(userId: string): Promise<MeProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, iaUnlimitedUntil: true },
    });

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { planKey: true, status: true, currentPeriodEnd: true },
    });

    // Premium only while the subscription is active AND still within its paid
    // period. A null period end means "no expiry tracked" (treat as active); a
    // past end means it lapsed even if the webhook never flipped `status`.
    const active =
      !!subscription &&
      subscription.status === 'active' &&
      (subscription.currentPeriodEnd === null ||
        subscription.currentPeriodEnd > new Date());

    const planKey: PlanKeyValue = active
      ? (subscription!.planKey as PlanKeyValue)
      : 'free';

    const creditBalance = await this.credits.getBalance(userId);

    const iaUnlimited =
      user.iaUnlimitedUntil !== null && user.iaUnlimitedUntil > new Date();

    return {
      email: user.email,
      planKey,
      planName: PLAN_NAMES[planKey],
      creditBalance,
      iaUnlimited,
      iaUnlimitedUntil: user.iaUnlimitedUntil
        ? user.iaUnlimitedUntil.toISOString()
        : null,
    };
  }

  async getTelegramUnlockStatus(userId: string): Promise<TelegramUnlockStatus> {
    const record = await this.prisma.telegramUnlock.findUnique({
      where: { userId },
    });
    return this.toTelegramStatus(record);
  }

  async startTelegramUnlock(userId: string): Promise<TelegramUnlockStatus> {
    const record = await this.prisma.telegramUnlock.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toTelegramStatus(record);
  }

  async claimTelegramUnlock(userId: string): Promise<TelegramUnlockStatus> {
    const record = await this.prisma.telegramUnlock.findUnique({
      where: { userId },
    });
    const status = this.toTelegramStatus(record);
    if (!record || !status.eligible) return status;

    const unlockedAt = record.unlockedAt ?? new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.telegramUnlock.update({
        where: { userId },
        data: { unlockedAt },
      });
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planKey: TELEGRAM_UNLOCK_PLAN,
          status: 'active',
          provider: 'telegram-wait',
          externalId: `telegram-wait:${userId}`,
          currentPeriodEnd: null,
        },
        update: {
          planKey: TELEGRAM_UNLOCK_PLAN,
          status: 'active',
          provider: 'telegram-wait',
          externalId: `telegram-wait:${userId}`,
          currentPeriodEnd: null,
        },
      });
    });

    return this.toTelegramStatus({ ...record, unlockedAt });
  }

  private toTelegramStatus(record: {
    clickedAt: Date;
    unlockedAt: Date | null;
  } | null): TelegramUnlockStatus {
    if (!record) {
      return {
        startedAt: null,
        claimAt: null,
        unlockedAt: null,
        remainingSeconds: TELEGRAM_UNLOCK_WAIT_SECONDS,
        eligible: false,
        planKey: TELEGRAM_UNLOCK_PLAN,
      };
    }

    const claimAt = new Date(
      record.clickedAt.getTime() + TELEGRAM_UNLOCK_WAIT_SECONDS * 1000,
    );
    const remainingSeconds = Math.max(
      0,
      Math.ceil((claimAt.getTime() - Date.now()) / 1000),
    );

    return {
      startedAt: record.clickedAt.toISOString(),
      claimAt: claimAt.toISOString(),
      unlockedAt: record.unlockedAt ? record.unlockedAt.toISOString() : null,
      remainingSeconds,
      eligible: remainingSeconds === 0 || record.unlockedAt !== null,
      planKey: TELEGRAM_UNLOCK_PLAN,
    };
  }
}
