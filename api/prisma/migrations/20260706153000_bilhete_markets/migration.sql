ALTER TABLE "Bilhete" ADD COLUMN "mercado" TEXT;
ALTER TABLE "Bilhete" ADD COLUMN "selecao" TEXT;
ALTER TABLE "Bilhete" ADD COLUMN "linha" DECIMAL(6,2);

ALTER TABLE "SportEvent" ADD COLUMN "markets" JSONB;
ALTER TABLE "SportEvent" ADD COLUMN "countryIso" TEXT;
