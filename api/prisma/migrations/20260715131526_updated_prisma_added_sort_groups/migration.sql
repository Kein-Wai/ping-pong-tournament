-- CreateEnum
CREATE TYPE "SortGroups" AS ENUM ('Snake', 'Aleatorio');

-- AlterTable
ALTER TABLE "tournament" ADD COLUMN     "sort_groups" "SortGroups" DEFAULT 'Snake',
ALTER COLUMN "groups_created" SET DEFAULT false,
ALTER COLUMN "knockout_created" SET DEFAULT false;
