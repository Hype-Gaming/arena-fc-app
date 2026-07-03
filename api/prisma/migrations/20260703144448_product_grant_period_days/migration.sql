-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "grantPeriodDays" INTEGER;

-- Preserve prior behavior for existing plan products: they used to grant a
-- fixed one-month period. New products default to NULL (= lifetime).
UPDATE "Product" SET "grantPeriodDays" = 30 WHERE "grantType" = 'plan';
