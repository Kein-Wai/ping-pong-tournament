/*
  Warnings:

  - The `type_tournament` column on the `league` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `level_tournament` column on the `league` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `league` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `match` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type_tournament` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `level_tournament` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `rounds` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type_knockout` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `players_knockout` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sort_knockout` column on the `tournament` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tournament_group` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tournament_knockout` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `tournament_participant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `round` on the `tournament_knockout` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('Programado', 'Iniciado', 'Abierto', 'Completado', 'Cancelado');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('Programado', 'Iniciado', 'Grupos', 'R128avos', 'R64avos', 'R32avos', 'R16avos', 'Octavos', 'Cuartos', 'Semifinales', 'Final', 'Completado', 'Cancelado');

-- CreateEnum
CREATE TYPE "PlayerTournamentStatus" AS ENUM ('Pendiente', 'Confirmado', 'NoPresentado');

-- CreateEnum
CREATE TYPE "TypeTournament" AS ENUM ('Interno', 'Abierto', 'Oficial');

-- CreateEnum
CREATE TYPE "LevelTournament" AS ENUM ('Principiante', 'Intermedio', 'Avanzado', 'Federado', 'Mixto');

-- CreateEnum
CREATE TYPE "Rounds" AS ENUM ('TodosvsTodos', 'GruposKnockout', 'Knockout');

-- CreateEnum
CREATE TYPE "RoundKnockouts" AS ENUM ('R128avos', 'R64avos', 'R32avos', 'R16avos', 'Octavos', 'Cuartos', 'Semifinales', 'Final');

-- CreateEnum
CREATE TYPE "TypeKnockout" AS ENUM ('LlaveA', 'LlaveAB');

-- CreateEnum
CREATE TYPE "SortKnockout" AS ENUM ('RoundRobin', 'Aleatorio');

-- AlterTable
ALTER TABLE "league" DROP COLUMN "type_tournament",
ADD COLUMN     "type_tournament" "TypeTournament" DEFAULT 'Interno',
DROP COLUMN "level_tournament",
ADD COLUMN     "level_tournament" "LevelTournament" DEFAULT 'Mixto',
DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" DEFAULT 'Programado';

-- AlterTable
ALTER TABLE "league_clas" ADD COLUMN     "played" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "match" DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" DEFAULT 'Programado';

-- AlterTable
ALTER TABLE "tournament" DROP COLUMN "type_tournament",
ADD COLUMN     "type_tournament" "TypeTournament" DEFAULT 'Interno',
DROP COLUMN "level_tournament",
ADD COLUMN     "level_tournament" "LevelTournament" DEFAULT 'Mixto',
DROP COLUMN "rounds",
ADD COLUMN     "rounds" "Rounds" DEFAULT 'GruposKnockout',
DROP COLUMN "status",
ADD COLUMN     "status" "TournamentStatus" DEFAULT 'Programado',
DROP COLUMN "type_knockout",
ADD COLUMN     "type_knockout" "TypeKnockout" DEFAULT 'LlaveA',
DROP COLUMN "players_knockout",
ADD COLUMN     "players_knockout" INTEGER,
DROP COLUMN "sort_knockout",
ADD COLUMN     "sort_knockout" "SortKnockout" DEFAULT 'RoundRobin';

-- AlterTable
ALTER TABLE "tournament_group" DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" DEFAULT 'Programado';

-- AlterTable
ALTER TABLE "tournament_knockout" DROP COLUMN "round",
ADD COLUMN     "round" "RoundKnockouts" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "MatchStatus" DEFAULT 'Programado';

-- AlterTable
ALTER TABLE "tournament_participant" DROP COLUMN "status",
ADD COLUMN     "status" "PlayerTournamentStatus" DEFAULT 'Pendiente';
