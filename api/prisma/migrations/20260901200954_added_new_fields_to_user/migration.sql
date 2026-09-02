-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('Diestro', 'Zurdo');

-- CreateEnum
CREATE TYPE "Playstyle" AS ENUM ('Ofensivo', 'Defensivo');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "dominant_hand" "DominantHand",
ADD COLUMN     "playstyle" "Playstyle";
