/*
  Warnings:

  - You are about to drop the column `action` on the `point_analysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "point_analysis" DROP COLUMN "action",
ADD COLUMN     "placement" VARCHAR(255),
ADD COLUMN     "side" VARCHAR(255),
ADD COLUMN     "technique" VARCHAR(255),
ALTER COLUMN "phase" DROP NOT NULL;
