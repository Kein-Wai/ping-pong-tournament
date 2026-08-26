-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('Control_CT', 'Bloqueo_Contraataque', 'Movilidad_Lateral', 'Movilidad_Pivot', 'Semi_Variables', 'Recepcion_Flip_Reves', 'Recepciones_Cortas', 'Recepciones_Largas', 'Recepciones_Cortas_Largas', 'Recepcion_Saques_Intermedios', 'Saques_Largos', 'Servicios_Ataque', 'Individuales');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('Activo', 'Completado', 'Cancelado');

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "club_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "code" INTEGER,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_training" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "sessions_per_week" INTEGER NOT NULL,
    "weeks" INTEGER NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'Activo',
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "player_training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_session" (
    "id" TEXT NOT NULL,
    "player_training_id" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "training_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_exercise" (
    "id" TEXT NOT NULL,
    "training_session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "durationMinutes" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "session_exercise_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_training" ADD CONSTRAINT "player_training_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_player_training_id_fkey" FOREIGN KEY ("player_training_id") REFERENCES "player_training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_training_session_id_fkey" FOREIGN KEY ("training_session_id") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
