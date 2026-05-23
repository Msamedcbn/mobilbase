-- Buyback cutover migration: reconciliation + notifications + ERP sync logs

DO $$ BEGIN
  CREATE TYPE "ReconciliationStatus" AS ENUM ('NONE', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MailLogStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "BuybackDeal"
  ADD COLUMN IF NOT EXISTS "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'NONE';

UPDATE "BuybackDeal"
SET "reconciliationStatus" = 'NONE'
WHERE "reconciliationStatus" IS NULL;

CREATE TABLE IF NOT EXISTS "BuybackReconciliation" (
  "id" TEXT NOT NULL,
  "buybackDealId" TEXT NOT NULL,
  "customerPrice" DECIMAL(10,2) NOT NULL,
  "companyPrice" DECIMAL(10,2) NOT NULL,
  "differenceAmount" DECIMAL(10,2) NOT NULL,
  "customerAnswers" TEXT,
  "companyAnswers" TEXT,
  "diffItems" TEXT,
  "tokenHash" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'SENT',
  "customerNote" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "viewedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BuybackReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuybackReconciliation_tokenHash_key" ON "BuybackReconciliation"("tokenHash");
CREATE INDEX IF NOT EXISTS "BuybackReconciliation_buybackDealId_idx" ON "BuybackReconciliation"("buybackDealId");
CREATE INDEX IF NOT EXISTS "BuybackReconciliation_status_idx" ON "BuybackReconciliation"("status");
CREATE INDEX IF NOT EXISTS "BuybackReconciliation_tokenExpiresAt_idx" ON "BuybackReconciliation"("tokenExpiresAt");

CREATE TABLE IF NOT EXISTS "BuybackNotification" (
  "id" TEXT NOT NULL,
  "buybackDealId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "status" "MailLogStatus" NOT NULL DEFAULT 'QUEUED',
  "errorMessage" TEXT,
  "contextJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "BuybackNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BuybackNotification_buybackDealId_idx" ON "BuybackNotification"("buybackDealId");
CREATE INDEX IF NOT EXISTS "BuybackNotification_status_idx" ON "BuybackNotification"("status");
CREATE INDEX IF NOT EXISTS "BuybackNotification_createdAt_idx" ON "BuybackNotification"("createdAt");

CREATE TABLE IF NOT EXISTS "ErpSyncLog" (
  "id" TEXT NOT NULL,
  "syncType" TEXT NOT NULL,
  "insertedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "payloadJson" TEXT,
  "resultJson" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErpSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErpSyncLog_syncType_idx" ON "ErpSyncLog"("syncType");
CREATE INDEX IF NOT EXISTS "ErpSyncLog_createdAt_idx" ON "ErpSyncLog"("createdAt");

DO $$ BEGIN
  ALTER TABLE "BuybackReconciliation"
    ADD CONSTRAINT "BuybackReconciliation_buybackDealId_fkey"
    FOREIGN KEY ("buybackDealId") REFERENCES "BuybackDeal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BuybackReconciliation"
    ADD CONSTRAINT "BuybackReconciliation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BuybackNotification"
    ADD CONSTRAINT "BuybackNotification_buybackDealId_fkey"
    FOREIGN KEY ("buybackDealId") REFERENCES "BuybackDeal"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ErpSyncLog"
    ADD CONSTRAINT "ErpSyncLog_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
