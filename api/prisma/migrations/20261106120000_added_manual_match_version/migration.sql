-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_sync_id" TEXT;
