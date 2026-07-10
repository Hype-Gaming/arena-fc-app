import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { GamificationService } from '../gamification/gamification.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type PlanKeyValue = 'free' | 'premium' | 'diamante';

/** Human-facing plan names keyed by the PlanKey enum. */
const PLAN_NAMES: Record<PlanKeyValue, string> = {
  free: 'Livre',
  premium: 'Premium',
  diamante: 'Diamante',
};

export interface MeProfile {
  email: string;
  /** Self-chosen display name, or null (front falls back to the email handle). */
  nickname: string | null;
  /** Preset avatar emblem key, or null (front shows the default emblem). */
  avatarKey: string | null;
  planKey: PlanKeyValue;
  planName: string;
  creditBalance: number;
  /** Active "acesso ilimitado" pass — analyses don't consume credits. */
  iaUnlimited: boolean;
  /** When the unlimited pass expires (ISO), or null if none. */
  iaUnlimitedUntil: string | null;
}

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly gamification: GamificationService,
  ) {}

  async getProfile(userId: string): Promise<MeProfile> {
    // Opening the app counts toward the daily-login streak (idempotent per day).
    // A streak hiccup must never break the profile response.
    await this.gamification
      .registerDailyLogin(userId)
      .catch(() => undefined);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        nickname: true,
        avatarKey: true,
        iaUnlimitedUntil: true,
      },
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
      nickname: user.nickname,
      avatarKey: user.avatarKey,
      planKey,
      planName: PLAN_NAMES[planKey],
      creditBalance,
      iaUnlimited,
      iaUnlimitedUntil: user.iaUnlimitedUntil
        ? user.iaUnlimitedUntil.toISOString()
        : null,
    };
  }

  /**
   * Update the caller's identity (nickname and/or preset avatar). Values are
   * already shape-validated by UpdateProfileDto; we just trim the nickname and
   * persist whichever fields were provided.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MeProfile> {
    const data: { nickname?: string; avatarKey?: string } = {};
    if (dto.nickname !== undefined) data.nickname = dto.nickname.trim();
    if (dto.avatarKey !== undefined) data.avatarKey = dto.avatarKey;

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data });
    }
    return this.getProfile(userId);
  }
}
