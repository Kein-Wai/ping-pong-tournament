/*
  Warnings:

  - You are about to drop the column `error_modifier` on the `point_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `phase` on the `point_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `side` on the `point_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `technique` on the `point_analysis` table. All the data in the column will be lost.
  - The `placement` column on the `point_analysis` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('Light', 'Deep');

-- CreateEnum
CREATE TYPE "PointCategory" AS ENUM ('Servicio', 'Ataque', 'Defensa', 'Resto', 'FalloSaque', 'ErrorNoForzado', 'ErrorForzado', 'Movilidad', 'SinRazon');

-- CreateEnum
CREATE TYPE "PointSubcategory" AS ENUM ('Cortado', 'Topeado', 'SinEfecto', 'Derecha', 'Reves');

-- CreateEnum
CREATE TYPE "PointPlacement" AS ENUM ('Derecha', 'Reves', 'Centro');

-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "analysis_type" "AnalysisType" NOT NULL DEFAULT 'Deep',
ADD COLUMN     "light_notes" TEXT;

-- AlterTable
ALTER TABLE "point_analysis" DROP COLUMN "error_modifier",
DROP COLUMN "phase",
DROP COLUMN "side",
DROP COLUMN "technique",
ADD COLUMN     "category" "PointCategory",
ADD COLUMN     "subcategory" "PointSubcategory",
DROP COLUMN "placement",
ADD COLUMN     "placement" "PointPlacement";

-- DropEnum
DROP TYPE "ErrorModifier";

-- DropEnum
DROP TYPE "PointPhase";

-- DropEnum
DROP TYPE "StrokePlacement";

-- DropEnum
DROP TYPE "StrokeSide";

-- DropEnum
DROP TYPE "StrokeTechnique";
