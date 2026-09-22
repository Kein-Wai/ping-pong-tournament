/*
  Warnings:

  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamMatch` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,season_id]` on the table `player_skills` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,season_id]` on the table `stats` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_clubId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMatch" DROP CONSTRAINT "TeamMatch_teamId_fkey";

-- DropForeignKey
ALTER TABLE "_TeamToUser" DROP CONSTRAINT "_TeamToUser_A_fkey";

-- DropIndex
DROP INDEX "player_skills_user_id_key";

-- DropIndex
DROP INDEX "stats_user_id_key";

-- AlterTable
ALTER TABLE "general_training" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "league" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "match" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "player_skills" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "player_training" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "stats" ADD COLUMN     "season_id" TEXT;

-- AlterTable
ALTER TABLE "tournament" ADD COLUMN     "season_id" TEXT;

-- DropTable
DROP TABLE "Team";

-- DropTable
DROP TABLE "TeamMatch";

-- CreateTable
CREATE TABLE "season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "season_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_match" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "rivalName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Programado',
    "ourScore" INTEGER,
    "rivalScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "season_name_key" ON "season"("name");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_user_id_season_id_key" ON "player_skills"("user_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "stats_user_id_season_id_key" ON "stats"("user_id", "season_id");

-- AddForeignKey
ALTER TABLE "player_training" ADD CONSTRAINT "player_training_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stats" ADD CONSTRAINT "stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league" ADD CONSTRAINT "league_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_match" ADD CONSTRAINT "manual_match_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training" ADD CONSTRAINT "general_training_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_match" ADD CONSTRAINT "team_match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamToUser" ADD CONSTRAINT "_TeamToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
