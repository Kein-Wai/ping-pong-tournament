-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('Bug', 'Sugerencia');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('Pendiente', 'Revisado', 'Resuelto');

-- CreateTable
CREATE TABLE "app_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'Pendiente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "app_feedback" ADD CONSTRAINT "app_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
