import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

/** Human-facing plan names keyed by the PlanKey enum. */
const PLAN_NAMES: Record<'free' | 'premium', string> = {
  free: 'Free',
  premium: 'Premium',
};

export interface MeProfile {
  email: string;
  planKey: 'free' | 'premium';
  planName: string;
  creditBalance: number;
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
      select: { email: true },
    });

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { planKey: true, status: true },
    });

    const planKey =
      subscription && subscription.status === 'active'
        ? (subscription.planKey as 'free' | 'premium')
        : 'free';

    const creditBalance = await this.credits.getBalance(userId);

    return {
      email: user.email,
      planKey,
      planName: PLAN_NAMES[planKey],
      creditBalance,
    };
  }
}
