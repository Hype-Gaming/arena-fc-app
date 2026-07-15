-- Live score capture on SportEvent, used by the settle poller to grade bilhetes
-- once a match finishes.
ALTER TABLE "SportEvent"
  ADD COLUMN "homeScore" INTEGER,
  ADD COLUMN "awayScore" INTEGER,
  ADD COLUMN "scoreSeenAt" TIMESTAMP(3),
  ADD COLUMN "finishedAt" TIMESTAMP(3);
