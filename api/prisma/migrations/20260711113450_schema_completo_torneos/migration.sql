-- CreateTable
CREATE TABLE "user_type" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL,
    "user_type_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "surname" VARCHAR(255) NOT NULL,
    "secondsurname" VARCHAR(255),
    "nickname" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats" (
    "id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" INTEGER,
    "match_won" INTEGER,
    "match_lost" INTEGER,
    "set_won" INTEGER,
    "set_losts" INTEGER,
    "point_won" INTEGER,
    "point_lost" INTEGER,
    "tournament_won" INTEGER,
    "tournament_lost" INTEGER,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match" (
    "id" BIGINT NOT NULL,
    "datestart" DATE NOT NULL,
    "tournament_id" BIGINT,
    "group_id" BIGINT,
    "knockout_id" BIGINT,
    "league_id" BIGINT,
    "player_one" INTEGER NOT NULL,
    "player_two" INTEGER NOT NULL,
    "set_one_player_one" BIGINT DEFAULT 0,
    "set_one_player_two" BIGINT DEFAULT 0,
    "set_two_player_one" BIGINT DEFAULT 0,
    "set_two_player_two" BIGINT DEFAULT 0,
    "set_three_player_one" BIGINT DEFAULT 0,
    "set_three_player_two" BIGINT DEFAULT 0,
    "set_four_player_one" BIGINT DEFAULT 0,
    "set_four_player_two" BIGINT DEFAULT 0,
    "set_five_player_one" BIGINT DEFAULT 0,
    "set_five_player_two" BIGINT DEFAULT 0,
    "set_six_player_one" BIGINT DEFAULT 0,
    "set_six_player_two" BIGINT DEFAULT 0,
    "set_seven_player_one" BIGINT DEFAULT 0,
    "set_seven_player_two" BIGINT DEFAULT 0,
    "status" VARCHAR(255),

    CONSTRAINT "match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament" (
    "id" BIGINT NOT NULL,
    "datestart" DATE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "num_players" INTEGER NOT NULL,
    "num_group" INTEGER,
    "num_group_players" INTEGER,
    "type_tournament" VARCHAR(255),
    "level_tournament" VARCHAR(255),
    "rounds" VARCHAR(255),
    "status" VARCHAR(255),
    "type_knockout" VARCHAR(255),
    "players_knockout" VARCHAR(255),
    "sort_knockout" VARCHAR(255),
    "all_pos" BOOLEAN,
    "groups_created" BOOLEAN,
    "knockout_created" BOOLEAN,

    CONSTRAINT "tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league" (
    "id" BIGINT NOT NULL,
    "datestart" DATE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "num_players" BIGINT NOT NULL,
    "type_tournament" VARCHAR(255),
    "level_tournament" VARCHAR(255),
    "status" VARCHAR(255),

    CONSTRAINT "league_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_group" (
    "id" BIGINT NOT NULL,
    "tournament_id" BIGINT NOT NULL,
    "group" INTEGER NOT NULL,
    "status" VARCHAR(255),

    CONSTRAINT "tournament_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_knockout" (
    "id" BIGINT NOT NULL,
    "tournament_id" BIGINT NOT NULL,
    "round" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255),

    CONSTRAINT "tournament_knockout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_group_clas" (
    "id" BIGINT NOT NULL,
    "tournament_group_id" BIGINT NOT NULL,
    "player_id" INTEGER NOT NULL,
    "games_won" INTEGER DEFAULT 0,
    "games_lost" INTEGER DEFAULT 0,
    "sets_won" INTEGER DEFAULT 0,
    "sets_lost" INTEGER DEFAULT 0,
    "points_won" INTEGER DEFAULT 0,
    "points_lost" INTEGER DEFAULT 0,
    "points_clas" INTEGER DEFAULT 0,
    "position" INTEGER DEFAULT 0,

    CONSTRAINT "tournament_group_clas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_clas" (
    "id" BIGINT NOT NULL,
    "league_id" BIGINT NOT NULL,
    "player_id" INTEGER NOT NULL,
    "games_won" INTEGER DEFAULT 0,
    "games_lost" INTEGER DEFAULT 0,
    "sets_won" INTEGER DEFAULT 0,
    "sets_lost" INTEGER DEFAULT 0,
    "points_won" INTEGER DEFAULT 0,
    "points_lost" INTEGER DEFAULT 0,
    "points_clas" INTEGER DEFAULT 0,
    "position" INTEGER DEFAULT 0,
    "status" VARCHAR(255),

    CONSTRAINT "league_clas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_type_name_key" ON "user_type"("name");

-- CreateIndex
CREATE INDEX "user_name_email_index" ON "user"("name", "email");

-- CreateIndex
CREATE UNIQUE INDEX "league_name_key" ON "league"("name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_user_type_id_fkey" FOREIGN KEY ("user_type_id") REFERENCES "user_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stats" ADD CONSTRAINT "stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "tournament_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_knockout_id_fkey" FOREIGN KEY ("knockout_id") REFERENCES "tournament_knockout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_player_one_foreign" FOREIGN KEY ("player_one") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_player_two_foreign" FOREIGN KEY ("player_two") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group" ADD CONSTRAINT "tournament_group_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_knockout" ADD CONSTRAINT "tournament_knockout_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_clas" ADD CONSTRAINT "tournament_group_clas_tournament_group_id_fkey" FOREIGN KEY ("tournament_group_id") REFERENCES "tournament_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_clas" ADD CONSTRAINT "tournament_group_clas_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_clas" ADD CONSTRAINT "league_clas_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "league"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_clas" ADD CONSTRAINT "league_clas_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
