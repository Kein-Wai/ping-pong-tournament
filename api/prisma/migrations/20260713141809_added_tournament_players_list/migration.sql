-- CreateTable
CREATE TABLE "tournament_participant" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "tournament_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participant_tournament_id_player_id_key" ON "tournament_participant"("tournament_id", "player_id");

-- AddForeignKey
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
