/*
  Warnings:

  - Added the required column `city` to the `club` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "club" ADD COLUMN     "address" VARCHAR(255),
ADD COLUMN     "city" VARCHAR(255) NOT NULL,
ADD COLUMN     "founded_at" TIMESTAMP(3);
