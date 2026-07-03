-- CreateEnum
CREATE TYPE "BilheteCategoria" AS ENUM ('safes', 'pro', 'ultra', 'alavancagem', 'multiplas', 'secundario', 'ligas');

-- CreateEnum
CREATE TYPE "BilheteResultado" AS ENUM ('pending', 'green', 'red');

-- AlterEnum
ALTER TYPE "PlanKey" ADD VALUE 'diamante';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Bilhete" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Bilhete Especial',
    "categoria" "BilheteCategoria" NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeColor" TEXT,
    "awayColor" TEXT,
    "competition" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "odd" DECIMAL(6,2) NOT NULL,
    "resultado" "BilheteResultado" NOT NULL DEFAULT 'pending',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bilhete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bilhete_categoria_startsAt_idx" ON "Bilhete"("categoria", "startsAt");
