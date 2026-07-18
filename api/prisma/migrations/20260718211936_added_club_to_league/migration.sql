-- AlterTable
ALTER TABLE "league" ADD COLUMN     "club_id" TEXT;

-- AddForeignKey
ALTER TABLE "league" ADD CONSTRAINT "league_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
