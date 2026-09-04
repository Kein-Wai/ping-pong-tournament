-- CreateTable
CREATE TABLE "player_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
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

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_user_id_key" ON "player_skills"("user_id");

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
