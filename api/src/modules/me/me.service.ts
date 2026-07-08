import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

export type PlanKeyValue = 'free' | 'premium' | 'diamante';

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
}
