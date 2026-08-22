-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GUEST', 'WECHAT');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('REGISTER_GRANT', 'GENERATION_DEBIT', 'GENERATION_REFUND_FULL', 'GENERATION_REFUND_PARTIAL', 'ACTIVITY_GRANT', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "GenTaskStatusDb" AS ENUM ('DEDUCTED', 'SUBMITTED', 'GENERATING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED_ALL');

-- CreateEnum
CREATE TYPE "GenProvider" AS ENUM ('MESHY', 'RODIN');

-- CreateEnum
CREATE TYPE "AnchorContentType" AS ENUM ('MODEL', 'IMAGE', 'TEXT');

-- CreateEnum
CREATE TYPE "AnchorVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AnchorStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "AltitudeSource" AS ENUM ('GEOSPATIAL', 'GPS');

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_ledger" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gen_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "GenTaskStatusDb" NOT NULL DEFAULT 'DEDUCTED',
    "provider" "GenProvider" NOT NULL DEFAULT 'MESHY',
    "provider_task_id" TEXT,
    "photo_oss_key" TEXT,
    "glb_oss_key" TEXT,
    "thumbnail_oss_keys" TEXT[],
    "params" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "refund_token" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gen_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anchors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_type" "AnchorContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content_ref" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "altitude" DOUBLE PRECISION NOT NULL,
    "altitude_source" "AltitudeSource" NOT NULL DEFAULT 'GPS',
    "visibility" "AnchorVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "AnchorStatus" NOT NULL DEFAULT 'VISIBLE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anchors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_uid_key" ON "auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_accounts_user_id_key" ON "token_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "token_ledger_idempotency_key_key" ON "token_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "token_ledger_account_created_idx" ON "token_ledger"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "gen_tasks_provider_task_id_key" ON "gen_tasks"("provider_task_id");

-- CreateIndex
CREATE INDEX "gen_tasks_status_created_idx" ON "gen_tasks"("status", "created_at");

-- CreateIndex
CREATE INDEX "anchors_status_expires_idx" ON "anchors"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_accounts" ADD CONSTRAINT "token_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "token_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gen_tasks" ADD CONSTRAINT "gen_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
