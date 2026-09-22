-- AlterTable
ALTER TABLE "user" ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" VARCHAR(255);
