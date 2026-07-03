-- AlterTable
ALTER TABLE "Bilhete" ADD COLUMN     "eventDeepLink" TEXT,
ADD COLUMN     "eventExternalId" TEXT;

-- CreateTable
CREATE TABLE "SportEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "competition" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "oddHome" DECIMAL(6,2),
    "oddDraw" DECIMAL(6,2),
    "oddAway" DECIMAL(6,2),
    "deepLink" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportEvent_startsAt_idx" ON "SportEvent"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SportEvent_provider_externalId_key" ON "SportEvent"("provider", "externalId");
