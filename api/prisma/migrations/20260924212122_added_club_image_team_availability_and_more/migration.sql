-- AlterTable
ALTER TABLE "club" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "birthDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "team_match_availability" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "team_match_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_match_availability_matchId_playerId_key" ON "team_match_availability"("matchId", "playerId");

-- AddForeignKey
ALTER TABLE "team_match_availability" ADD CONSTRAINT "team_match_availability_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "team_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_match_availability" ADD CONSTRAINT "team_match_availability_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
