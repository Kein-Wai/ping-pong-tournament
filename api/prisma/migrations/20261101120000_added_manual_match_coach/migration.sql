-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "coach_id" TEXT;

-- AddForeignKey
ALTER TABLE "manual_match" ADD CONSTRAINT "manual_match_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
