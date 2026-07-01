import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { levelForXp, xpForEvent } from './level.util';
import {
  GAMIFICATION_EVENTS,
  GamificationEventName,
  GamificationEventPayload,
} from './events/gamification-events';
import { AchievementCriteria } from '../../../prisma/seeds/achievements.seed';

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
      xp = user.xp + xpAwarded;
      level = levelForXp(xp);
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { xp, level },
        select: { id: true, xp: true, level: true },
      });
      xp = updated.xp;
      level = updated.level;
    }

    const newAchievementKeys = await this.evaluateAchievements(user.id, level);

    return { userId: user.id, xp, level, xpAwarded, newAchievementKeys };
  }

  private knownEvent(name: string): name is GamificationEventName {
    return (GAMIFICATION_EVENTS as readonly string[]).includes(name);
  }

  /**
   * Check every achievement the user has NOT yet unlocked; insert the ones
   * whose criteria are now met. Implemented in Task 5.
   */
  private async evaluateAchievements(
    userId: string,
    currentLevel: number,
  ): Promise<string[]> {
    void userId;
    void currentLevel;
    return [];
  }
}
