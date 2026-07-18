-- CreateTable
CREATE TABLE "tournament_clas" (
    "id" TEXT NOT NULL,
    "tournament_group_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "lastRound" "RoundKnockouts",
    "position" INTEGER DEFAULT 0,

    CONSTRAINT "tournament_clas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tournament_clas" ADD CONSTRAINT "tournament_clas_tournament_group_id_fkey" FOREIGN KEY ("tournament_group_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_clas" ADD CONSTRAINT "tournament_clas_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
