/*
  Warnings:

  - You are about to drop the column `score` on the `stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stats" DROP COLUMN "score",
ADD COLUMN     "elo" INTEGER DEFAULT 500;
