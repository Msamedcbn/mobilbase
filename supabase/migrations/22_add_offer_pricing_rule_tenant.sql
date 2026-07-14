-- 22_add_offer_pricing_rule_tenant.sql
ALTER TABLE "OfferPricingRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

CREATE INDEX IF NOT EXISTS "OfferPricingRule_tenantId_brand_idx" ON "OfferPricingRule"("tenantId", "brand");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OfferPricingRule_tenantId_fkey'
  ) THEN
    ALTER TABLE "OfferPricingRule"
      ADD CONSTRAINT "OfferPricingRule_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
