/*
  Warnings:

  - You are about to alter the column `num_players` on the `league` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_one_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_one_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_two_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_two_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_three_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_three_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_four_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_four_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_five_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_five_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_six_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_six_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_seven_player_one` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `set_seven_player_two` on the `match` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "league" ALTER COLUMN "num_players" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "match" ALTER COLUMN "set_one_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_one_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_two_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_two_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_three_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_three_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_four_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_four_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_five_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_five_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_six_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_six_player_two" SET DATA TYPE INTEGER,
ALTER COLUMN "set_seven_player_one" SET DATA TYPE INTEGER,
ALTER COLUMN "set_seven_player_two" SET DATA TYPE INTEGER;
