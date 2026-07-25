-- Production-safe index creation for the multi-tenant hardening change.
--
-- WHY THIS FILE EXISTS
-- Prisma wraps each migration.sql in a transaction, and CREATE INDEX CONCURRENTLY
-- cannot run inside one. The plain CREATE INDEX statements in the migration take
-- a SHARE lock that blocks writes to the table while the index builds — fine on
-- an empty CI database, not fine on a live dealer database during business hours.
--
-- NOT NEEDED YET — 2026-07-25
-- These indexes were applied with a plain `prisma db push`, which finished in
-- under four seconds. At the time the largest table held fewer than 100 rows, so
-- the write lock a plain CREATE INDEX takes was immaterial. Keep this file for
-- when the tables are large enough that the lock matters — roughly once any
-- table reaches hundreds of thousands of rows, which 20+ active tenants will
-- reach. Re-check with:
--   SELECT relname, reltuples::bigint FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY reltuples DESC;
--
-- HOW TO USE
--   1. Run this file against production FIRST, outside any transaction:
--        psql -f scripts/apply-indexes-concurrently.sql -d "$DIRECT_URL"
--      Options must precede -d: the bundled psql does not permute arguments.
--      On this workstation psql is not on PATH; it ships with the PostgreSQL
--      install at "/c/Program Files/PostgreSQL/16/bin/psql.exe".
--      DIRECT_URL must be a session-mode connection. Supabase's pooler on port
--      5432 is session mode and works; the 6543 transaction-mode pooler in
--      DATABASE_URL does not, because CONCURRENTLY needs a dedicated session.
--   2. Then apply the schema change as usual (prisma migrate deploy / db push).
--      Every index below is IF NOT EXISTS, so step 2 becomes a no-op for them.
--
-- IF A STATEMENT FAILS
-- A failed CONCURRENTLY build leaves an INVALID index behind. Find them with:
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
-- Drop each with DROP INDEX CONCURRENTLY "<name>"; then re-run this file.
--
-- This script is idempotent and safe to re-run.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Customer_tenantId_createdAt_idx" ON "Customer"("tenantId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Device_customerId_idx" ON "Device"("customerId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackWizardData_customerId_idx" ON "BuybackWizardData"("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackWizardData_deviceId_idx" ON "BuybackWizardData"("deviceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackWizardData_productId_idx" ON "BuybackWizardData"("productId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "RepairRecord_deviceId_idx" ON "RepairRecord"("deviceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RepairRecord_branchId_idx" ON "RepairRecord"("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RepairRecord_status_createdAt_idx" ON "RepairRecord"("status", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_tenantId_issuedAt_idx" ON "Invoice"("tenantId", "issuedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackDeal_customerId_createdAt_idx" ON "BuybackDeal"("customerId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackDeal_deviceId_idx" ON "BuybackDeal"("deviceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackDeal_branchId_idx" ON "BuybackDeal"("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BuybackDeal_bankAccountId_idx" ON "BuybackDeal"("bankAccountId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "PosSale_tenantId_soldAt_idx" ON "PosSale"("tenantId", "soldAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PosSale_customerId_idx" ON "PosSale"("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PosSale_branchId_idx" ON "PosSale"("branchId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "StockItem_tenantId_isActive_idx" ON "StockItem"("tenantId", "isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "StockItem_tenantId_createdAt_idx" ON "StockItem"("tenantId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AccountEntry_customerId_createdAt_idx" ON "AccountEntry"("customerId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AccountEntry_bankAccountId_idx" ON "AccountEntry"("bankAccountId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_tenantId_createdAt_idx" ON "Transaction"("tenantId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_customerId_idx" ON "Transaction"("customerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_branchId_idx" ON "Transaction"("branchId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_bankAccountId_idx" ON "Transaction"("bankAccountId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TransactionItem_transactionId_idx" ON "TransactionItem"("transactionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TransactionItem_productId_idx" ON "TransactionItem"("productId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AppUser_tenantId_idx" ON "AppUser"("tenantId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AppUser_branchId_idx" ON "AppUser"("branchId");

-- Requires AuditLog."tenantId" to exist. Add the column first (it is a
-- metadata-only add in PG11+ and does not need CONCURRENTLY):
--   ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductBranchStock_branchId_idx" ON "ProductBranchStock"("branchId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProductVariant_tenantId_idx" ON "ProductVariant"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");
