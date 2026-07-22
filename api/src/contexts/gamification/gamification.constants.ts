// XP awarded per domain event. Single source of truth used by level.util and the service.
export const XP_REWARDS: Record<string, number> = {
  'daily.login': 5,
  'entrada.unlocked': 10,
  'entrada.green': 25,
  referral: 50,
};

// Cumulative XP required to REACH each level. Index 0 => level 1 (0 xp),
// index 1 => level 2, etc. Monotonically increasing.
export const LEVEL_THRESHOLDS: number[] = [
  0, // level 1
  100, // level 2
  250, // level 3
  500, // level 4
  1000, // level 5
  2000, // level 6
  3500, // level 7
  5500, // level 8
  8000, // level 9
  12000, // level 10
];
