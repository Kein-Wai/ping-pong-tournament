-- AlterTable
ALTER TABLE "player_skill_update" ADD COLUMN     "experiencia" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "player_skills" ADD COLUMN     "experiencia" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "skill_update_template" ADD COLUMN     "experiencia" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "general_training_schedule" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "general_training_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_training" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "includes_saturday" BOOLEAN NOT NULL DEFAULT false,
    "includes_sunday" BOOLEAN NOT NULL DEFAULT false,
    "schedule_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,

    CONSTRAINT "general_training_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "player_skill_update" ADD CONSTRAINT "player_skill_update_general_training_id_fkey" FOREIGN KEY ("general_training_id") REFERENCES "general_training"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training_schedule" ADD CONSTRAINT "general_training_schedule_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training" ADD CONSTRAINT "general_training_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training" ADD CONSTRAINT "general_training_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "general_training_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training" ADD CONSTRAINT "general_training_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "skill_update_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
