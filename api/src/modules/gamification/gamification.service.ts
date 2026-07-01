import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** EventEmitter2 bridge: other modules emit, we react. */
  @OnEvent('daily.login')
  @OnEvent('entrada.unlocked')
  @OnEvent('entrada.green')
  @OnEvent('referral')
  async onDomainEvent(payload: GamificationEventPayload): Promise<void> {
    await this.handleEvent(payload);
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
      select: { id: true, xp: true, level: true },
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

    const newAchievementKeys = await this.evaluateAchievements(user.id, level);

    return { userId: user.id, xp, level, xpAwarded, newAchievementKeys };
  }

  /** Read model for the Perfil screen: XP, level bounds, and achievement status. */
  async getProfileGamification(
    userId: string,
  ): Promise<ProfileGamificationDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, xp: true, level: true },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const [allAchievements, owned] = await Promise.all([
      this.prisma.achievement.findMany({
        select: { key: true, name: true, description: true, icon: true, criteria: true },
        orderBy: { key: 'asc' },
      }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementKey: true, unlockedAt: true, progress: true },
      }),
    ]);

    const ownedMap = new Map(owned.map((u) => [u.achievementKey, u]));

    const achievements: AchievementStatusDto[] = allAchievements.map((a) => {
      const criteria = a.criteria as unknown as AchievementCriteria;
      const ua = ownedMap.get(a.key);
      return {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon ?? '',
        unlocked: !!ua,
        unlockedAt: ua?.unlockedAt ? ua.unlockedAt.toISOString() : null,
        progress: ua?.progress ?? 0,
        threshold: criteria.threshold,
      };
    });

    const currentLevelFloor = LEVEL_THRESHOLDS[user.level - 1] ?? 0;
    const nextLevelXp =
      user.level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[user.level] : null;

    return {
      xp: user.xp,
      level: user.level,
      currentLevelFloor,
      nextLevelXp,
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
  ): Promise<string[]> {
    const [all, owned] = await Promise.all([
      this.prisma.achievement.findMany({ select: { key: true, criteria: true } }),
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

    const newlyUnlocked: { key: string; progress: number }[] = [];
    for (const achievement of candidates) {
      const criteria = achievement.criteria as unknown as AchievementCriteria;
      const progress = await this.measure(userId, criteria, currentLevel);
      if (progress >= criteria.threshold) {
        newlyUnlocked.push({ key: achievement.key, progress: criteria.threshold });
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

    return newlyUnlocked.map((u) => u.key);
  }

  /** Current measured value for a criteria type (used to compare vs threshold). */
  private async measure(
    userId: string,
    criteria: AchievementCriteria,
    currentLevel: number,
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
      case 'referral_count':
        // Referral tracking is owned by a future slice; 0 until wired.
        return 0;
      default:
        return 0;
    }
  }
}
