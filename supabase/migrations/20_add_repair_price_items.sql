-- 20_add_repair_price_items.sql
CREATE TABLE IF NOT EXISTS "RepairPriceItem" (
  "id" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "partType" TEXT NOT NULL,
  "partName" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT,
  CONSTRAINT "RepairPriceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RepairPriceItem_tenantId_brand_model_idx" ON "RepairPriceItem"("tenantId", "brand", "model");
CREATE INDEX IF NOT EXISTS "RepairPriceItem_tenantId_createdAt_idx" ON "RepairPriceItem"("tenantId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepairPriceItem_tenantId_fkey'
  ) THEN
    ALTER TABLE "RepairPriceItem"
      ADD CONSTRAINT "RepairPriceItem_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
