ALTER TABLE "Bilhete" ADD COLUMN "validUntil" TIMESTAMP(3);

CREATE INDEX "Bilhete_validUntil_idx" ON "Bilhete"("validUntil");
