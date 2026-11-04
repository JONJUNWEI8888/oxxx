-- CreateEnum
CREATE TYPE "presale_direction" AS ENUM ('inbound', 'outbound');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "mfa_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mfa_locked_until" TIMESTAMP(3),
ADD COLUMN     "totp_last_step" INTEGER;

-- AlterTable
ALTER TABLE "presale_contributions" ADD COLUMN     "direction" "presale_direction" NOT NULL DEFAULT 'inbound';

-- CreateTable
CREATE TABLE "admin_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "admin_role" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "totp_secret_cipher" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_invites_token_hash_key" ON "admin_invites"("token_hash");

-- CreateIndex
CREATE INDEX "admin_invites_email_idx" ON "admin_invites"("email");

-- AddForeignKey
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
