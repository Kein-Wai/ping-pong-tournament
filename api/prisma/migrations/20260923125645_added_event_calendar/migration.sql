-- CreateEnum
CREATE TYPE "EventRegion" AS ENUM ('Club', 'Local', 'Regional', 'Autonomico', 'Nacional', 'Internacional');

-- CreateTable
CREATE TABLE "club_event" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "season_id" TEXT,
    "name" VARCHAR(255) NOT NULL,
    "region" "EventRegion" NOT NULL DEFAULT 'Club',
    "date" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(255),
    "color" TEXT NOT NULL DEFAULT 'blue',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminder" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notify_at" DATE NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "event_reminder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "club_event" ADD CONSTRAINT "club_event_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_event" ADD CONSTRAINT "club_event_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "club_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
