-- CreateEnum
CREATE TYPE "KnockoutType" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "tournament_knockout" ADD COLUMN     "type" "KnockoutType" NOT NULL DEFAULT 'A';
