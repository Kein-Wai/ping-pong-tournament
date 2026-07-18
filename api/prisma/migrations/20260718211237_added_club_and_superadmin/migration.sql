/*
  Warnings:

  - Changed the type of `name` on the `user_type` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TypeUser" AS ENUM ('SuperAdmin', 'AdminClub', 'Player');

-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('Pendiente', 'Aprobado', 'Inactivo');

-- CreateEnum
CREATE TYPE "UserClubStatus" AS ENUM ('Registrado', 'Pendiente', 'Aprobado', 'Rechazado');

-- AlterTable
ALTER TABLE "tournament" ADD COLUMN     "club_id" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "club_id" TEXT,
ADD COLUMN     "club_status" "UserClubStatus" DEFAULT 'Registrado';

-- AlterTable
ALTER TABLE "user_type" DROP COLUMN "name",
ADD COLUMN     "name" "TypeUser" NOT NULL;

-- CreateTable
CREATE TABLE "club" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "ClubStatus" NOT NULL DEFAULT 'Pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_name_key" ON "club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_type_name_key" ON "user_type"("name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
