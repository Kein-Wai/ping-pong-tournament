/*
  Warnings:

  - The primary key for the `league` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `league_clas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `match` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `stats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tournament` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tournament_group` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tournament_group_clas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `tournament_knockout` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_type` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "league_clas" DROP CONSTRAINT "league_clas_league_id_fkey";

-- DropForeignKey
ALTER TABLE "league_clas" DROP CONSTRAINT "league_clas_player_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_group_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_knockout_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_league_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_player_one_foreign";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_player_two_foreign";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "stats" DROP CONSTRAINT "stats_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_group" DROP CONSTRAINT "tournament_group_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_group_clas" DROP CONSTRAINT "tournament_group_clas_player_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_group_clas" DROP CONSTRAINT "tournament_group_clas_tournament_group_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_knockout" DROP CONSTRAINT "tournament_knockout_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_user_type_id_fkey";

-- AlterTable
ALTER TABLE "league" DROP CONSTRAINT "league_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "league_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "league_clas" DROP CONSTRAINT "league_clas_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "league_id" SET DATA TYPE TEXT,
ALTER COLUMN "player_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "league_clas_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "match" DROP CONSTRAINT "match_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tournament_id" SET DATA TYPE TEXT,
ALTER COLUMN "group_id" SET DATA TYPE TEXT,
ALTER COLUMN "knockout_id" SET DATA TYPE TEXT,
ALTER COLUMN "league_id" SET DATA TYPE TEXT,
ALTER COLUMN "player_one" SET DATA TYPE TEXT,
ALTER COLUMN "player_two" SET DATA TYPE TEXT,
ADD CONSTRAINT "match_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "stats" DROP CONSTRAINT "stats_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "stats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tournament" DROP CONSTRAINT "tournament_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "tournament_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tournament_group" DROP CONSTRAINT "tournament_group_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tournament_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "tournament_group_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tournament_group_clas" DROP CONSTRAINT "tournament_group_clas_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tournament_group_id" SET DATA TYPE TEXT,
ALTER COLUMN "player_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "tournament_group_clas_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tournament_knockout" DROP CONSTRAINT "tournament_knockout_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "tournament_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "tournament_knockout_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_type_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_type" DROP CONSTRAINT "user_type_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_type_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stats" ADD CONSTRAINT "stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "tournament_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_knockout_id_fkey" FOREIGN KEY ("knockout_id") REFERENCES "tournament_knockout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_player_one_foreign" FOREIGN KEY ("player_one") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_player_two_foreign" FOREIGN KEY ("player_two") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group" ADD CONSTRAINT "tournament_group_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_knockout" ADD CONSTRAINT "tournament_knockout_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_clas" ADD CONSTRAINT "tournament_group_clas_tournament_group_id_fkey" FOREIGN KEY ("tournament_group_id") REFERENCES "tournament_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_clas" ADD CONSTRAINT "tournament_group_clas_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_clas" ADD CONSTRAINT "league_clas_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_clas" ADD CONSTRAINT "league_clas_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
