-- Add optional product/stock variant and procurement document fields
ALTER TABLE "StockItem"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "variantColor" TEXT,
  ADD COLUMN "variantStorage" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "imei" TEXT,
  ADD COLUMN "purchaseDocType" TEXT,
  ADD COLUMN "purchaseDocNo" TEXT;

ALTER TABLE "Product"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "model" TEXT,
  ADD COLUMN "variantColor" TEXT,
  ADD COLUMN "variantStorage" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "imei" TEXT,
  ADD COLUMN "purchaseDocType" TEXT,
  ADD COLUMN "purchaseDocNo" TEXT;
