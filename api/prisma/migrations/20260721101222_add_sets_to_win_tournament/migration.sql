-- AlterTable
ALTER TABLE "tournament" ADD COLUMN     "sets_to_win_group" INTEGER DEFAULT 2,
ADD COLUMN     "sets_to_win_knockout" INTEGER DEFAULT 3;
