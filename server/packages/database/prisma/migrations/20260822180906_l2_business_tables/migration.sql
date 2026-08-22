-- 职责:B1 业务表补全(T1):anchor_grants/share_tokens/reports/moderation_records/points_accounts/points_ledger/agreement_versions/consent_records + anchors.ai_generated
-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('ANCHOR', 'GEN_TASK', 'USER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('COPYRIGHT', 'ILLEGAL_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('PASS', 'REJECT', 'MARK_REVIEW');

-- CreateEnum
CREATE TYPE "ModerationScene" AS ENUM ('NICKNAME', 'ANCHOR_TITLE', 'REPORT_TEXT', 'CHECKIN_TEXT', 'GEN_PARAMS', 'STORE_ITEM');

-- CreateEnum
CREATE TYPE "PointsReason" AS ENUM ('CHECKIN', 'UPLOAD', 'DOWNLOADED', 'COMMENT', 'LIKED', 'PURCHASE', 'STORE_REDEEM', 'ADMIN_ADJUST');

-- DropIndex
DROP INDEX "anchors_geog_gist";

-- AlterTable
ALTER TABLE "anchors" DROP COLUMN "geog",
ADD COLUMN     "ai_generated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "anchor_grants" (
    "id" TEXT NOT NULL,
    "anchor_id" TEXT NOT NULL,
    "grantee_id" TEXT NOT NULL,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anchor_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" TEXT NOT NULL,
    "anchor_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_summary" TEXT,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "sla_deadline" TIMESTAMP(3) NOT NULL,
    "handled_by_id" TEXT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_records" (
    "id" TEXT NOT NULL,
    "scene" "ModerationScene" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "verdict" "ModerationVerdict" NOT NULL,
    "risk_words" TEXT[],
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_ledger" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "PointsReason" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_versions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_url" TEXT,
    "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agreement_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anchor_grants_grantee_idx" ON "anchor_grants"("grantee_id");

-- CreateIndex
CREATE UNIQUE INDEX "anchor_grants_anchor_grantee_key" ON "anchor_grants"("anchor_id", "grantee_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_hash_key" ON "share_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "share_tokens_anchor_idx" ON "share_tokens"("anchor_id");

-- CreateIndex
CREATE INDEX "reports_status_sla_idx" ON "reports"("status", "sla_deadline");

-- CreateIndex
CREATE INDEX "reports_target_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_records_target_idx" ON "moderation_records"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_accounts_user_id_key" ON "points_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "points_ledger_idempotency_key_key" ON "points_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "points_ledger_account_created_idx" ON "points_ledger"("account_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_versions_key_version_key" ON "agreement_versions"("key", "version");

-- CreateIndex
CREATE INDEX "consent_records_user_key_idx" ON "consent_records"("user_id", "agreement_key");

-- AddForeignKey
ALTER TABLE "anchor_grants" ADD CONSTRAINT "anchor_grants_anchor_id_fkey" FOREIGN KEY ("anchor_id") REFERENCES "anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anchor_grants" ADD CONSTRAINT "anchor_grants_grantee_id_fkey" FOREIGN KEY ("grantee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_anchor_id_fkey" FOREIGN KEY ("anchor_id") REFERENCES "anchors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_accounts" ADD CONSTRAINT "points_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "points_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

