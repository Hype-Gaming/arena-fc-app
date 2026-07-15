-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_seq_key" ON "CreditTransaction"("seq");
