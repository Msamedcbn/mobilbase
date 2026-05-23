-- 14_tenant_data_isolation.sql: Add tenant scoping to all business models and adjust unique constraints

-- 1. Add tenantId columns if they do not exist
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "StockItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PosSale" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 2. Ensure default tenant exists and backfill existing data
DO $$
DECLARE
  default_tenant_id TEXT;
BEGIN
  -- Get ID of default tenant
  SELECT id INTO default_tenant_id FROM "Customer" WHERE "fullName" = 'TelefoncuPro' LIMIT 1;
  
  -- Create default tenant if it doesn't exist
  IF default_tenant_id IS NULL THEN
    INSERT INTO "Customer" ("id", "fullName", "phone", "notes", "createdAt", "updatedAt")
    VALUES ('cust-tenant-seed', 'TelefoncuPro', '5550000001', '{"isSaaS":true}', NOW(), NOW())
    RETURNING id INTO default_tenant_id;
  END IF;

  -- Backfill existing records
  UPDATE "Customer" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL AND id <> default_tenant_id AND ("notes" IS NULL OR "notes" NOT LIKE '%"isSaaS":true%');
  UPDATE "Branch" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "BankAccount" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "Product" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "StockItem" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "PosSale" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "Transaction" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  UPDATE "Invoice" SET "tenantId" = default_tenant_id WHERE "tenantId" IS NULL;
  
  -- Also ensure default admin is mapped to this tenant
  UPDATE "AppUser" SET "tenantId" = default_tenant_id WHERE email = 'admin@telefoncupro.local' AND "tenantId" IS NULL;
END $$;

-- 3. Add Foreign Key constraints
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Create Indexes for query performance
CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");
CREATE INDEX IF NOT EXISTS "BankAccount_tenantId_idx" ON "BankAccount"("tenantId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX IF NOT EXISTS "StockItem_tenantId_idx" ON "StockItem"("tenantId");
CREATE INDEX IF NOT EXISTS "PosSale_tenantId_idx" ON "PosSale"("tenantId");
CREATE INDEX IF NOT EXISTS "Transaction_tenantId_idx" ON "Transaction"("tenantId");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- 5. Drop old global unique constraints
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_phone_key";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_nationalId_key";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_barcode_key";
ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_name_key";
ALTER TABLE "BankAccount" DROP CONSTRAINT IF EXISTS "BankAccount_name_key";
ALTER TABLE "StockItem" DROP CONSTRAINT IF EXISTS "StockItem_sku_key";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_invoiceNo_key";
ALTER TABLE "PosSale" DROP CONSTRAINT IF EXISTS "PosSale_saleNo_key";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_transactionNo_key";

-- 6. Add new compound unique constraints scoped by tenantId
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_phone_tenantId_key" UNIQUE ("phone", "tenantId");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_nationalId_tenantId_key" UNIQUE ("nationalId", "tenantId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_barcode_tenantId_key" UNIQUE ("barcode", "tenantId");
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_name_tenantId_key" UNIQUE ("name", "tenantId");
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_name_tenantId_key" UNIQUE ("name", "tenantId");
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_sku_tenantId_key" UNIQUE ("sku", "tenantId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoiceNo_tenantId_key" UNIQUE ("invoiceNo", "tenantId");
ALTER TABLE "PosSale" ADD CONSTRAINT "PosSale_saleNo_tenantId_key" UNIQUE ("saleNo", "tenantId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_transactionNo_tenantId_key" UNIQUE ("transactionNo", "tenantId");
