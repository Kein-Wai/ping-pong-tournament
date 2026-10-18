/*
  Warnings:

  - Added the required column `player_id` to the `training_session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "objective" TEXT;

-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "opponentRubberBackhand" "RubberType",
ADD COLUMN     "opponentRubberForehand" "RubberType";

-- AlterTable
ALTER TABLE "stats" ADD COLUMN     "manual_match_lost" INTEGER DEFAULT 0,
ADD COLUMN     "manual_match_won" INTEGER DEFAULT 0,
ADD COLUMN     "manual_point_lost" INTEGER DEFAULT 0,
ADD COLUMN     "manual_point_won" INTEGER DEFAULT 0,
ADD COLUMN     "manual_set_lost" INTEGER DEFAULT 0,
ADD COLUMN     "manual_set_won" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "training_session" ADD COLUMN     "player_id" TEXT NOT NULL,
ADD COLUMN     "title" VARCHAR(255),
ALTER COLUMN "player_training_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
