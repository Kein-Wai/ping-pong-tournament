/*
  Warnings:

  - You are about to drop the column `end_date` on the `general_training` table. All the data in the column will be lost.
  - You are about to drop the column `includes_saturday` on the `general_training` table. All the data in the column will be lost.
  - You are about to drop the column `includes_sunday` on the `general_training` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `general_training` table. All the data in the column will be lost.
  - Added the required column `date` to the `general_training` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "general_training" DROP COLUMN "end_date",
DROP COLUMN "includes_saturday",
DROP COLUMN "includes_sunday",
DROP COLUMN "start_date",
ADD COLUMN     "date" DATE NOT NULL;

-- AlterTable
ALTER TABLE "general_training_schedule" ADD COLUMN     "days_of_week" INTEGER[];
