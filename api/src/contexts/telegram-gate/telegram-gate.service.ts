import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Default wait between clicking the Telegram CTA and the app unlocking. */
export const DEFAULT_TELEGRAM_UNLOCK_WAIT_SECONDS = 600; // 10 minutes

export interface TelegramGateState {
  /** Whether the gate applies to this user at all (paid plans only). */
  applies: boolean;
  /** Whether the user has already clicked the Telegram CTA (timer started). */
  clicked: boolean;
  clickedAt: string | null;
  /** True once the wait window has elapsed (or the gate doesn't apply). */
  unlocked: boolean;
  waitSeconds: number;
  /** Seconds left until unlock (waitSeconds when not clicked, 0 when unlocked). */
  remainingSeconds: number;
}

/**
 * First-access "confirm your banca on Telegram" gate. Access to the app itself
 * comes from the paid plan; this is an extra onboarding ritual: the user clicks
 * through to the Telegram group and the main app functions stay gated until a
 * fixed wait (default 10 min) has passed. Unlock is time-based only — no deposit
 * verification — matching the standalone TelegramUnlock row per user.
 */
@Injectable()
export class TelegramGateService {
  constructor(private readonly prisma: PrismaService) {}

  private waitSeconds(): number {
    const raw = Number(process.env.TELEGRAM_UNLOCK_WAIT_SECONDS);
    return Number.isFinite(raw) && raw > 0
      ? raw
      : DEFAULT_TELEGRAM_UNLOCK_WAIT_SECONDS;
  }

  async getState(userId: string): Promise<TelegramGateState> {
    if (!(await this.appliesTo(userId))) return this.notApplies();
    const record = await this.prisma.telegramUnlock.findUnique({
      where: { userId },
    });
    return this.toState(record?.clickedAt ?? null);
  }

  /** First click starts the wait timer; later clicks never reset it. */
  async recordClick(userId: string): Promise<TelegramGateState> {
    if (!(await this.appliesTo(userId))) return this.notApplies();
    const record = await this.prisma.telegramUnlock.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toState(record.clickedAt);
  }

  /**
   * The gate only applies to paying users (premium/diamante): the "confirm your
   * banca" ritual is part of the post-payment funnel. Free users are never
   * gated — the app treats them as already unlocked.
   */
  private async appliesTo(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, planKey: true },
    });
    const active =
      !!sub &&
      sub.status === 'active' &&
      (sub.currentPeriodEnd === null || sub.currentPeriodEnd > new Date());
    return active && sub!.planKey !== 'free';
  }

  /** Gate-off state for users it doesn't apply to: always unlocked. */
  private notApplies(): TelegramGateState {
    const waitSeconds = this.waitSeconds();
    return {
      applies: false,
      clicked: false,
      clickedAt: null,
      unlocked: true,
      waitSeconds,
      remainingSeconds: 0,
    };
  }

  private toState(clickedAt: Date | null): TelegramGateState {
    const waitSeconds = this.waitSeconds();
    if (!clickedAt) {
      return {
        applies: true,
        clicked: false,
        clickedAt: null,
        unlocked: false,
        waitSeconds,
        remainingSeconds: waitSeconds,
      };
    }
    const elapsed = Math.floor((Date.now() - clickedAt.getTime()) / 1000);
    const remainingSeconds = Math.max(0, waitSeconds - elapsed);
    return {
      applies: true,
      clicked: true,
      clickedAt: clickedAt.toISOString(),
      unlocked: remainingSeconds === 0,
      waitSeconds,
      remainingSeconds,
    };
  }
}
