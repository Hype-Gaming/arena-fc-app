ALTER TABLE "Bilhete" ADD COLUMN "esportivaShareUrl" TEXT;

CREATE TABLE "BilheteLeg" (
    "id" TEXT NOT NULL,
    "bilheteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "mercado" TEXT NOT NULL,
    "selecao" TEXT NOT NULL,
    "linha" DECIMAL(6,2),
    "odd" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "BilheteLeg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BilheteLeg_bilheteId_position_key" ON "BilheteLeg"("bilheteId", "position");
CREATE INDEX "BilheteLeg_bilheteId_idx" ON "BilheteLeg"("bilheteId");

ALTER TABLE "BilheteLeg" ADD CONSTRAINT "BilheteLeg_bilheteId_fkey"
  FOREIGN KEY ("bilheteId") REFERENCES "Bilhete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
