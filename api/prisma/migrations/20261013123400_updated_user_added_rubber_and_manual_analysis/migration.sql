/*
  Warnings:

  - The values [Light,Deep] on the enum `AnalysisType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "RubberType" AS ENUM ('LISA', 'PICOS_CORTOS', 'PICOS_MEDIOS', 'PICOS_LARGOS', 'ANTISPIN');

-- AlterEnum
BEGIN;
CREATE TYPE "AnalysisType_new" AS ENUM ('Rapido', 'Extenso');
ALTER TABLE "manual_match" ALTER COLUMN "analysis_type" DROP DEFAULT;
ALTER TABLE "manual_match" ALTER COLUMN "analysis_type" TYPE "AnalysisType_new" USING ("analysis_type"::text::"AnalysisType_new");
ALTER TYPE "AnalysisType" RENAME TO "AnalysisType_old";
ALTER TYPE "AnalysisType_new" RENAME TO "AnalysisType";
DROP TYPE "AnalysisType_old";
ALTER TABLE "manual_match" ALTER COLUMN "analysis_type" SET DEFAULT 'Rapido';
COMMIT;

-- AlterTable
ALTER TABLE "manual_match" ADD COLUMN     "setScores" JSONB,
ALTER COLUMN "analysis_type" SET DEFAULT 'Rapido';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "rubberBackhand" "RubberType",
ADD COLUMN     "rubberForehand" "RubberType";
