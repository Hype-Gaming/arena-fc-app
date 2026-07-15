-- First-access Telegram wait gate. A user clicks the Telegram CTA, waits the
-- configured window, then can claim the complete app plan.
CREATE TABLE "TelegramUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramUnlock_userId_key" ON "TelegramUnlock"("userId");

ALTER TABLE "TelegramUnlock"
ADD CONSTRAINT "TelegramUnlock_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
