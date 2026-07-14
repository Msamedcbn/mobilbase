-- 23_add_requires_serial_number.sql
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "requiresSerialNumber" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OfferPricingRule" ADD COLUMN IF NOT EXISTS "requiresSerialNumber" BOOLEAN NOT NULL DEFAULT true;
