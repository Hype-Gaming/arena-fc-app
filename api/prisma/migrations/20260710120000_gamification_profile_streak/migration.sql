-- User: profile identity (nickname + preset avatar) and daily-login streak.
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "avatarKey" TEXT;
ALTER TABLE "User" ADD COLUMN "currentLoginStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "bestLoginStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Achievement: persisted grouping category and the XP granted on unlock.
ALTER TABLE "Achievement" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'permanent';
ALTER TABLE "Achievement" ADD COLUMN "rewardXp" INTEGER NOT NULL DEFAULT 0;
