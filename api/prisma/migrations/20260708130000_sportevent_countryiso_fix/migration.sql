-- Corrective, idempotent migration. `countryIso` is declared in the
-- 20260706153000_bilhete_markets migration, but that file was edited after it
-- had already been applied to some databases, leaving them without the column
-- (schema drift). ADD COLUMN IF NOT EXISTS fixes drifted databases and is a
-- no-op on fresh ones (where bilhete_markets already created it).
ALTER TABLE "SportEvent" ADD COLUMN IF NOT EXISTS "countryIso" TEXT;
