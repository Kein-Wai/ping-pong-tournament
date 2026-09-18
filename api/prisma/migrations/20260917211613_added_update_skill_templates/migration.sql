-- CreateEnum
CREATE TYPE "UpdateSourceType" AS ENUM ('EntrenamientoGeneral', 'EntrenamientoEspecifico', 'Partido');

-- CreateEnum
CREATE TYPE "SkillUpdateStatus" AS ENUM ('EXPECTED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "skill_update_template" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "source_type" "UpdateSourceType" NOT NULL,
    "derechaPlano" BOOLEAN NOT NULL DEFAULT false,
    "revesPlano" BOOLEAN NOT NULL DEFAULT false,
    "topspinDerecha" BOOLEAN NOT NULL DEFAULT false,
    "topspinReves" BOOLEAN NOT NULL DEFAULT false,
    "corte" BOOLEAN NOT NULL DEFAULT false,
    "bloqueoDerecha" BOOLEAN NOT NULL DEFAULT false,
    "bloqueoReves" BOOLEAN NOT NULL DEFAULT false,
    "servicio" BOOLEAN NOT NULL DEFAULT false,
    "recepcion" BOOLEAN NOT NULL DEFAULT false,
    "movilidad" BOOLEAN NOT NULL DEFAULT false,
    "fortalezaMental" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "skill_update_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skill_update" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SkillUpdateStatus" NOT NULL DEFAULT 'EXPECTED',
    "source_type" "UpdateSourceType" NOT NULL,
    "derechaPlano" INTEGER NOT NULL DEFAULT 0,
    "revesPlano" INTEGER NOT NULL DEFAULT 0,
    "topspinDerecha" INTEGER NOT NULL DEFAULT 0,
    "topspinReves" INTEGER NOT NULL DEFAULT 0,
    "corte" INTEGER NOT NULL DEFAULT 0,
    "bloqueoDerecha" INTEGER NOT NULL DEFAULT 0,
    "bloqueoReves" INTEGER NOT NULL DEFAULT 0,
    "servicio" INTEGER NOT NULL DEFAULT 0,
    "recepcion" INTEGER NOT NULL DEFAULT 0,
    "movilidad" INTEGER NOT NULL DEFAULT 0,
    "fortalezaMental" INTEGER NOT NULL DEFAULT 0,
    "match_id" TEXT,
    "training_session_id" TEXT,
    "general_training_id" TEXT,

    CONSTRAINT "player_skill_update_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "player_skill_update" ADD CONSTRAINT "player_skill_update_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skill_update" ADD CONSTRAINT "player_skill_update_training_session_id_fkey" FOREIGN KEY ("training_session_id") REFERENCES "training_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skill_update" ADD CONSTRAINT "player_skill_update_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
