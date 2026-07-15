-- AlterEnum
ALTER TYPE "GrantType" ADD VALUE 'ia_unlimited';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "iaUnlimitedUntil" TIMESTAMP(3);
