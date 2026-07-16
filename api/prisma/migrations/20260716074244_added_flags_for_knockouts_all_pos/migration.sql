-- AlterTable
ALTER TABLE "match" ADD COLUMN     "loser_goes_to" TEXT,
ADD COLUMN     "winner_goes_to" TEXT;

-- AlterTable
ALTER TABLE "tournament_knockout" ADD COLUMN     "positions" VARCHAR(50);
