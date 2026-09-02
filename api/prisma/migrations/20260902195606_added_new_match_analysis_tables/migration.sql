-- CreateEnum
CREATE TYPE "MatchLocation" AS ENUM ('Casa', 'Fuera');

-- CreateEnum
CREATE TYPE "ManualMatchType" AS ENUM ('Liga', 'Competicion', 'Amistoso');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('Individual', 'Equipos');

-- CreateEnum
CREATE TYPE "OpponentLevel" AS ENUM ('Peor', 'Igual', 'Mejor');

-- CreateTable
CREATE TABLE "manual_match" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "location" "MatchLocation" NOT NULL,
    "match_type" "ManualMatchType" NOT NULL,
    "format" "MatchFormat" NOT NULL,
    "opponent_name" VARCHAR(255) NOT NULL,
    "opponent_hand" "DominantHand",
    "opponent_style" "Playstyle",
    "opponent_level" "OpponentLevel",
    "status" "MatchStatus" NOT NULL DEFAULT 'Programado',
    "my_sets" INTEGER NOT NULL DEFAULT 0,
    "opponent_sets" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "manual_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_analysis" (
    "id" TEXT NOT NULL,
    "manual_match_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "point_order" INTEGER NOT NULL,
    "is_won" BOOLEAN NOT NULL,
    "phase" VARCHAR(255) NOT NULL,
    "action" VARCHAR(255) NOT NULL,

    CONSTRAINT "point_analysis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "manual_match" ADD CONSTRAINT "manual_match_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_analysis" ADD CONSTRAINT "point_analysis_manual_match_id_fkey" FOREIGN KEY ("manual_match_id") REFERENCES "manual_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
