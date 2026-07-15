/*
  Warnings:

  - Made the column `position` on table `tournament_group_clas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tournament_group_clas" ALTER COLUMN "position" SET NOT NULL;
