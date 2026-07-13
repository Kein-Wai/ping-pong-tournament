/*
  Warnings:

  - You are about to drop the column `set_losts` on the `stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stats" DROP COLUMN "set_losts",
ADD COLUMN     "set_lost" INTEGER;
