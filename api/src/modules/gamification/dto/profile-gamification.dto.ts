// Response DTOs — assembled by GamificationService and serialized out; the `!`
// definite-assignment assertions satisfy strictPropertyInitialization (these are
// never constructed field-by-field, they're returned as plain shapes).
export class AchievementStatusDto {
  key!: string;
  name!: string;
  description!: string;
  icon!: string;
  unlocked!: boolean;
  unlockedAt!: string | null;
  progress!: number;
  threshold!: number;
}

export class ProfileGamificationDto {
  xp!: number;
  level!: number;
  /** Cumulative XP that defines the start of the current level. */
  currentLevelFloor!: number;
  /** Cumulative XP needed to reach the next level, or null if max level. */
  nextLevelXp!: number | null;
  achievements!: AchievementStatusDto[];
}
