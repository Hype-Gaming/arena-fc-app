import { levelForXp, xpForEvent, LEVEL_THRESHOLDS } from './level.util';

describe('level.util', () => {
  describe('levelForXp', () => {
    it('returns level 1 at 0 xp', () => {
      expect(levelForXp(0)).toBe(1);
    });

    it('stays level 1 just below the level-2 threshold', () => {
      expect(levelForXp(LEVEL_THRESHOLDS[1] - 1)).toBe(1);
    });

    it('promotes to level 2 exactly at the level-2 threshold', () => {
      expect(levelForXp(LEVEL_THRESHOLDS[1])).toBe(2);
    });

    it('returns the highest level when xp exceeds the top threshold', () => {
      const top = LEVEL_THRESHOLDS.length;
      expect(levelForXp(LEVEL_THRESHOLDS[top - 1] + 100000)).toBe(top);
    });

    it('never returns a level below 1 for negative xp', () => {
      expect(levelForXp(-50)).toBe(1);
    });
  });

  describe('xpForEvent', () => {
    it('maps each known domain event to its xp reward', () => {
      expect(xpForEvent('daily.login')).toBe(5);
      expect(xpForEvent('entrada.unlocked')).toBe(10);
      expect(xpForEvent('entrada.green')).toBe(25);
      expect(xpForEvent('referral')).toBe(50);
    });

    it('returns 0 for an unknown event', () => {
      expect(xpForEvent('something.else')).toBe(0);
    });
  });
});
