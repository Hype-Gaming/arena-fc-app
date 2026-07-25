-- Production databases that applied the first version of
-- 20260723000000_add_bilhete_oddid have these fields as INTEGER.  Odd ids are
-- opaque sportsbook identifiers and can exceed JavaScript's safe integer range,
-- so the Prisma schema and API now use TEXT.  Preserve any existing values.
ALTER TABLE "Bilhete"
  ALTER COLUMN "oddId" TYPE TEXT USING "oddId"::TEXT;

ALTER TABLE "BilheteLeg"
  ALTER COLUMN "oddId" TYPE TEXT USING "oddId"::TEXT;
