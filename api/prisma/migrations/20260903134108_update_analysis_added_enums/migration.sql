/*
  Warnings:

  - The `phase` column on the `point_analysis` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `placement` column on the `point_analysis` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `side` column on the `point_analysis` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `technique` column on the `point_analysis` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PointPhase" AS ENUM ('Servicio', 'Resto', 'TerceraBola', 'Rally', 'Defensa', 'JuegoPies', 'ErrorRival', 'WinnerRival');

-- CreateEnum
CREATE TYPE "StrokeSide" AS ENUM ('Derecha', 'Reves');

-- CreateEnum
CREATE TYPE "StrokeTechnique" AS ENUM ('Ace', 'Corto', 'Largo', 'Flip', 'Corte', 'Push', 'Ataque', 'Top', 'Contra', 'Smash', 'Bloqueo', 'Globo', 'JuegoPies', 'Error', 'Winner');

-- CreateEnum
CREATE TYPE "StrokePlacement" AS ENUM ('Cruzado', 'Paralelo', 'Medio', 'Corto', 'Largo');

-- CreateEnum
CREATE TYPE "ErrorModifier" AS ENUM ('Red', 'Fuera', 'BloqueoRival', 'WinnerRival');

-- AlterTable
ALTER TABLE "point_analysis" ADD COLUMN     "error_modifier" "ErrorModifier",
DROP COLUMN "phase",
ADD COLUMN     "phase" "PointPhase",
DROP COLUMN "placement",
ADD COLUMN     "placement" "StrokePlacement",
DROP COLUMN "side",
ADD COLUMN     "side" "StrokeSide",
DROP COLUMN "technique",
ADD COLUMN     "technique" "StrokeTechnique";
