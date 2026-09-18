-- CreateTable
CREATE TABLE "general_training_attendance" (
    "id" TEXT NOT NULL,
    "general_training_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_training_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "general_training_attendance_general_training_id_player_id_key" ON "general_training_attendance"("general_training_id", "player_id");

-- AddForeignKey
ALTER TABLE "general_training_attendance" ADD CONSTRAINT "general_training_attendance_general_training_id_fkey" FOREIGN KEY ("general_training_id") REFERENCES "general_training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training_attendance" ADD CONSTRAINT "general_training_attendance_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_training_attendance" ADD CONSTRAINT "general_training_attendance_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
