import { LEVEL_THRESHOLDS, XP_REWARDS } from './gamification.constants';

export { LEVEL_THRESHOLDS };

/**
 * Derive the level from a cumulative XP value.
 * Level is 1-based; level N requires LEVEL_THRESHOLDS[N-1] cumulative XP.
 */
export function levelForXp(xp: number): number {
  const safeXp = xp < 0 ? 0 : xp;
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

/** XP reward for a given domain event name, or 0 if unknown. */
export function xpForEvent(eventName: string): number {
  return XP_REWARDS[eventName] ?? 0;
}
