-- Multi-tenant hardening: tenant-scoped audit logs, per-tenant installment rates,
-- and the indexes tenant-filtered queries need.
--
-- NOTE ON PRODUCTION: the CREATE INDEX statements below take a SHARE lock and
-- block writes to each table while they build. On a live database run
-- scripts/apply-indexes-concurrently.sql FIRST — it does the same work with
-- CREATE INDEX CONCURRENTLY (no write lock). Every statement here is guarded by
-- IF NOT EXISTS, so this migration then becomes a no-op for the indexes.

-- ─── Columns ─────────────────────────────────────────────────────────────────
-- Both are nullable adds, which are metadata-only in PostgreSQL 11+ (no rewrite).

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "cardInstallmentConfigs" JSONB;

-- ─── Backfill AuditLog.tenantId ──────────────────────────────────────────────
-- Best effort, from the relations that already carry a tenant. Rows we cannot
-- attribute stay NULL, which makes them invisible to tenant-scoped audit views —
-- the safe direction, since the alternative is showing one tenant another's log.

UPDATE "AuditLog" a
SET "tenantId" = c."tenantId"
FROM "Customer" c
WHERE a."tenantId" IS NULL
  AND a."customerId" = c."id"
  AND c."tenantId" IS NOT NULL;

UPDATE "AuditLog" a
SET "tenantId" = u."tenantId"
FROM "AppUser" u
WHERE a."tenantId" IS NULL
  AND a."actorUserId" = u."id"
  AND u."tenantId" IS NOT NULL;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_createdAt_idx" ON "Customer"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "Device_customerId_idx" ON "Device"("customerId");

CREATE INDEX IF NOT EXISTS "BuybackWizardData_customerId_idx" ON "BuybackWizardData"("customerId");
CREATE INDEX IF NOT EXISTS "BuybackWizardData_deviceId_idx" ON "BuybackWizardData"("deviceId");
CREATE INDEX IF NOT EXISTS "BuybackWizardData_productId_idx" ON "BuybackWizardData"("productId");

CREATE INDEX IF NOT EXISTS "RepairRecord_deviceId_idx" ON "RepairRecord"("deviceId");
CREATE INDEX IF NOT EXISTS "RepairRecord_branchId_idx" ON "RepairRecord"("branchId");
CREATE INDEX IF NOT EXISTS "RepairRecord_status_createdAt_idx" ON "RepairRecord"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_issuedAt_idx" ON "Invoice"("tenantId", "issuedAt");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");

CREATE INDEX IF NOT EXISTS "BuybackDeal_customerId_createdAt_idx" ON "BuybackDeal"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "BuybackDeal_deviceId_idx" ON "BuybackDeal"("deviceId");
CREATE INDEX IF NOT EXISTS "BuybackDeal_branchId_idx" ON "BuybackDeal"("branchId");
CREATE INDEX IF NOT EXISTS "BuybackDeal_bankAccountId_idx" ON "BuybackDeal"("bankAccountId");

CREATE INDEX IF NOT EXISTS "PosSale_tenantId_soldAt_idx" ON "PosSale"("tenantId", "soldAt");
CREATE INDEX IF NOT EXISTS "PosSale_customerId_idx" ON "PosSale"("customerId");
CREATE INDEX IF NOT EXISTS "PosSale_branchId_idx" ON "PosSale"("branchId");

CREATE INDEX IF NOT EXISTS "StockItem_tenantId_isActive_idx" ON "StockItem"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "StockItem_tenantId_createdAt_idx" ON "StockItem"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "AccountEntry_customerId_createdAt_idx" ON "AccountEntry"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "AccountEntry_bankAccountId_idx" ON "AccountEntry"("bankAccountId");

CREATE INDEX IF NOT EXISTS "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "Transaction_tenantId_createdAt_idx" ON "Transaction"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_customerId_idx" ON "Transaction"("customerId");
CREATE INDEX IF NOT EXISTS "Transaction_branchId_idx" ON "Transaction"("branchId");
CREATE INDEX IF NOT EXISTS "Transaction_bankAccountId_idx" ON "Transaction"("bankAccountId");

CREATE INDEX IF NOT EXISTS "TransactionItem_transactionId_idx" ON "TransactionItem"("transactionId");
CREATE INDEX IF NOT EXISTS "TransactionItem_productId_idx" ON "TransactionItem"("productId");

CREATE INDEX IF NOT EXISTS "AppUser_tenantId_idx" ON "AppUser"("tenantId");
CREATE INDEX IF NOT EXISTS "AppUser_branchId_idx" ON "AppUser"("branchId");

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");

CREATE INDEX IF NOT EXISTS "ProductBranchStock_branchId_idx" ON "ProductBranchStock"("branchId");

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX IF NOT EXISTS "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");

CREATE INDEX IF NOT EXISTS "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");
