import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { levelForXp, xpForEvent, LEVEL_THRESHOLDS } from './level.util';
import {
  GAMIFICATION_EVENTS,
  GamificationEventName,
  GamificationEventPayload,
} from './events/gamification-events';
import { AchievementCriteria } from '../../../prisma/seeds/achievements.seed';
import {
  ProfileGamificationDto,
  AchievementStatusDto,
} from './dto/profile-gamification.dto';

export interface GamificationResult {
  userId: string;
  xp: number;
  level: number;
  xpAwarded: number;
  newAchievementKeys: string[];
}

export interface DailyLoginResult {
  /** True when this call registered a new day (streak advanced / reset). */
  counted: boolean;
  currentLoginStreak: number;
  bestLoginStreak: number;
}

// Local-day boundary for the streak. Default -180 = America/São_Paulo (UTC-3,
// no DST). Integer day math avoids DST/timezone-library complexity.
const APP_TZ_OFFSET_MIN = Number(process.env.APP_TZ_OFFSET_MINUTES ?? -180);
function localDayKey(d: Date): number {
  return Math.floor((d.getTime() + APP_TZ_OFFSET_MIN * 60_000) / 86_400_000);
}

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** EventEmitter2 bridge: other modules emit, we react. */
  @OnEvent('daily.login')
  @OnEvent('entrada.unlocked')
  @OnEvent('entrada.green')
  @OnEvent('referral')
  async onDomainEvent(payload: GamificationEventPayload): Promise<void> {
    try {
      await this.handleEvent(payload);
    } catch (err) {
      // Events are asynchronous. A test teardown (or a real account deletion)
      // may remove the user after the originating transaction emitted the
      // event but before this listener acquires its lock. That stale event has
      // nothing left to update and must not be reported as an application
      // error by EventEmitter2.
      if (
        err instanceof NotFoundException ||
        (err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025')
      ) {
        return;
      }
      throw err;
    }
  }

  /**
   * Award XP for a domain event, recompute level from thresholds,
   * then evaluate achievement criteria. Returns the new state.
   */
  async handleEvent(
    payload: GamificationEventPayload,
  ): Promise<GamificationResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, xp: true, level: true, currentLoginStreak: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${payload.userId} not found`);
    }

    const xpAwarded = this.knownEvent(payload.eventName)
      ? xpForEvent(payload.eventName)
      : 0;

    let xp = user.xp;
    let level = user.level;

    if (xpAwarded > 0) {
      // Award atomically: read-then-write on `user.xp` would lose concurrent
      // XP from two events firing for the same user. Serialize per user with a
      // transaction-scoped advisory lock (seed 1 keeps this namespace distinct
      // from the credits ledger's seed 0), increment in place, then persist the
      // level derived from the true post-increment xp.
      const bumped = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id}, 1))`;
        const incremented = await tx.user.update({
          where: { id: user.id },
          data: { xp: { increment: xpAwarded } },
          select: { xp: true },
        });
        const newLevel = levelForXp(incremented.xp);
        await tx.user.update({
          where: { id: user.id },
          data: { level: newLevel },
        });
        return { xp: incremented.xp, level: newLevel };
      });
      xp = bumped.xp;
      level = bumped.level;
    }

    const newAchievementKeys = await this.evaluateAchievements(
      user.id,
      level,
      user.currentLoginStreak,
    );

    return { userId: user.id, xp, level, xpAwarded, newAchievementKeys };
  }

  /**
   * Register that the user opened the app today and advance the login streak.
   * Idempotent per local day: repeated calls the same day are no-ops. On a new
   * day it advances the streak (or resets to 1 after a gap), persists the new
   * best, then fires `daily.login` so XP + streak achievements are awarded.
   *
   * Serialized per user with a transaction advisory lock (seed 2, distinct from
   * the XP ledger's seed 1) so two concurrent app-opens can't double-count.
   */
  async registerDailyLogin(userId: string): Promise<DailyLoginResult> {
    const now = new Date();
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 2))`;
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: {
          lastLoginAt: true,
          currentLoginStreak: true,
          bestLoginStreak: true,
        },
      });
      if (!u) throw new NotFoundException(`User ${userId} not found`);

      const today = localDayKey(now);
      const prev = u.lastLoginAt ? localDayKey(u.lastLoginAt) : null;
      if (prev === today) {
        return {
          counted: false,
          currentLoginStreak: u.currentLoginStreak,
          bestLoginStreak: u.bestLoginStreak,
        };
      }

      const currentLoginStreak = prev === today - 1 ? u.currentLoginStreak + 1 : 1;
      const bestLoginStreak = Math.max(u.bestLoginStreak, currentLoginStreak);
      await tx.user.update({
        where: { id: userId },
        data: { lastLoginAt: now, currentLoginStreak, bestLoginStreak },
      });
      return { counted: true, currentLoginStreak, bestLoginStreak };
    });

    // Award login XP + evaluate streak achievements outside the streak tx (its
    // own advisory lock), only when a new day was actually registered.
    if (outcome.counted) {
      await this.handleEvent({ eventName: 'daily.login', userId });
    }
    return outcome;
  }

  /** Read model for the Perfil screen: XP, level bounds, and achievement status. */
  async getProfileGamification(
    userId: string,
  ): Promise<ProfileGamificationDto> {
    // Opening the Perfil counts as a visit too (idempotent per day), so the
    // streak shown here is always current even if /me raced this request.
    await this.registerDailyLogin(userId).catch(() => undefined);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        xp: true,
        level: true,
        currentLoginStreak: true,
        bestLoginStreak: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [allAchievements, owned] = await Promise.all([
      this.prisma.achievement.findMany({
        select: {
          key: true,
          name: true,
          description: true,
          icon: true,
          category: true,
          rewardXp: true,
          criteria: true,
        },
        orderBy: { key: 'asc' },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementKey: true, unlockedAt: true, progress: true },
      }),
    ]);

    const ownedMap = new Map(owned.map((u) => [u.achievementKey, u]));

    // Live progress toward each still-locked achievement, so the Perfil bars
    // fill in even before the milestone unlocks (Phase 6: partial progress).
    const liveProgress = (criteria: AchievementCriteria): number => {
      switch (criteria.type) {
        case 'login_streak':
          return user.currentLoginStreak;
        case 'level_reached':
          return user.level;
        default:
          return 0; // count-based types are measured lazily; keep persisted value
      }
    };

    const achievements: AchievementStatusDto[] = allAchievements.map((a) => {
      const criteria = a.criteria as unknown as AchievementCriteria;
      const ua = ownedMap.get(a.key);
      const progress = ua
        ? ua.progress
        : Math.min(criteria.threshold, liveProgress(criteria));
      return {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon ?? '',
        category: a.category,
        rewardXp: a.rewardXp,
        unlocked: !!ua,
        unlockedAt: ua?.unlockedAt ? ua.unlockedAt.toISOString() : null,
        progress,
        threshold: criteria.threshold,
      };
    });

    // Order by category (permanent → streak → daily), then by threshold so each
    // ladder reads easiest-first.
    const CATEGORY_ORDER: Record<string, number> = { permanent: 0, streak: 1, daily: 2 };
    achievements.sort(
      (a, b) =>
        (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9) ||
        a.threshold - b.threshold,
    );

    const currentLevelFloor = LEVEL_THRESHOLDS[user.level - 1] ?? 0;
    const nextLevelXp =
      user.level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[user.level] : null;

    return {
      xp: user.xp,
      level: user.level,
      currentLevelFloor,
      nextLevelXp,
      currentLoginStreak: user.currentLoginStreak,
      bestLoginStreak: user.bestLoginStreak,
      achievements,
    };
  }

  private knownEvent(name: string): name is GamificationEventName {
    return (GAMIFICATION_EVENTS as readonly string[]).includes(name);
  }

  /**
   * Check every achievement the user has NOT yet unlocked; insert the ones
   * whose criteria are now met.
   */
  private async evaluateAchievements(
    userId: string,
    currentLevel: number,
    currentStreak: number,
  ): Promise<string[]> {
    const [all, owned] = await Promise.all([
      this.prisma.achievement.findMany({
        select: { key: true, criteria: true, rewardXp: true },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementKey: true },
      }),
    ]);

    const ownedKeys = new Set(owned.map((u) => u.achievementKey));
    const candidates = all.filter((a) => !ownedKeys.has(a.key));
    if (candidates.length === 0) {
      return [];
    }

    const newlyUnlocked: { key: string; progress: number; rewardXp: number }[] = [];
    for (const achievement of candidates) {
      const criteria = achievement.criteria as unknown as AchievementCriteria;
      const progress = await this.measure(userId, criteria, currentLevel, currentStreak);
      if (progress >= criteria.threshold) {
        newlyUnlocked.push({
          key: achievement.key,
          progress: criteria.threshold,
          rewardXp: achievement.rewardXp,
        });
      }
    }

    if (newlyUnlocked.length === 0) {
      return [];
    }

    await this.prisma.userAchievement.createMany({
      data: newlyUnlocked.map((u) => ({
        userId,
        achievementKey: u.key,
        progress: u.progress,
      })),
      skipDuplicates: true,
    });

    // Grant each unlocked achievement's reward XP atomically (same advisory-lock
    // namespace as the event XP award, seed 1). A level threshold crossed purely
    // by this bonus is picked up on the next event — acceptable eventual
    // consistency, and avoids an unbounded evaluate→award→evaluate recursion.
    const bonus = newlyUnlocked.reduce((sum, u) => sum + u.rewardXp, 0);
    if (bonus > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 1))`;
        const inc = await tx.user.update({
          where: { id: userId },
          data: { xp: { increment: bonus } },
          select: { xp: true },
        });
        await tx.user.update({
          where: { id: userId },
          data: { level: levelForXp(inc.xp) },
        });
      });
    }

    return newlyUnlocked.map((u) => u.key);
  }

  /** Current measured value for a criteria type (used to compare vs threshold). */
  private async measure(
    userId: string,
    criteria: AchievementCriteria,
    currentLevel: number,
    currentStreak: number,
  ): Promise<number> {
    switch (criteria.type) {
      case 'unlock_count':
        return this.prisma.entradaUnlock.count({ where: { userId } });
      case 'green_count':
        return this.prisma.entrada.count({
          where: { status: 'green', unlocks: { some: { userId } } },
        });
      case 'level_reached':
        return currentLevel;
      case 'login_streak':
        return currentStreak;
      case 'referral_count':
        // Referral tracking is owned by a future slice; 0 until wired.
        return 0;
      default:
        return 0;
    }
  }
}
