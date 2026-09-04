-- CreateEnum
CREATE TYPE "PlayerLevel" AS ENUM ('Iniciacion', 'Principiante', 'Intermedio', 'Avanzado', 'Profesional');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "level" "PlayerLevel";
