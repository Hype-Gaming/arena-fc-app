ALTER TYPE "GrantType" ADD VALUE 'category_access';

ALTER TABLE "Product" ADD COLUMN "grantCategory" "BilheteCategoria";

CREATE TABLE "UserCategoryAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoria" "BilheteCategoria" NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserCategoryAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCategoryAccess_userId_categoria_key" ON "UserCategoryAccess"("userId", "categoria");
CREATE INDEX "UserCategoryAccess_userId_idx" ON "UserCategoryAccess"("userId");

ALTER TABLE "UserCategoryAccess" ADD CONSTRAINT "UserCategoryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
