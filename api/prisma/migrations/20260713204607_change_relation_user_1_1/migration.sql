/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `stats` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "stats_user_id_key" ON "stats"("user_id");
