/*
  Warnings:

  - The values [RoundRobin] on the enum `SortKnockout` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SortKnockout_new" AS ENUM ('Siembra', 'Aleatorio');
ALTER TABLE "tournament" ALTER COLUMN "sort_knockout" DROP DEFAULT;
ALTER TABLE "tournament" ALTER COLUMN "sort_knockout" TYPE "SortKnockout_new" USING ("sort_knockout"::text::"SortKnockout_new");
ALTER TYPE "SortKnockout" RENAME TO "SortKnockout_old";
ALTER TYPE "SortKnockout_new" RENAME TO "SortKnockout";
DROP TYPE "SortKnockout_old";
ALTER TABLE "tournament" ALTER COLUMN "sort_knockout" SET DEFAULT 'Siembra';
COMMIT;

-- AlterTable
ALTER TABLE "tournament" ALTER COLUMN "sort_knockout" SET DEFAULT 'Siembra';
