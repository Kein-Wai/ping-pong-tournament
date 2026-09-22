/*
  Warnings:

  - You are about to drop the column `tournament_lost` on the `stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stats" DROP COLUMN "tournament_lost",
ADD COLUMN     "tournament_part" INTEGER;
