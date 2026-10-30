-- DropIndex
DROP INDEX "league_name_key";

-- AlterTable
ALTER TABLE "league" ADD COLUMN     "double_round" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sets_to_win" INTEGER NOT NULL DEFAULT 2,
ALTER COLUMN "num_players" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "match" ADD COLUMN     "walkover" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "league_participant" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PlayerTournamentStatus" DEFAULT 'Pendiente',

    CONSTRAINT "league_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_participant_league_id_player_id_key" ON "league_participant"("league_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "league_club_id_name_key" ON "league"("club_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "league_clas_league_id_player_id_key" ON "league_clas"("league_id", "player_id");

-- AddForeignKey
ALTER TABLE "league_participant" ADD CONSTRAINT "league_participant_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_participant" ADD CONSTRAINT "league_participant_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

