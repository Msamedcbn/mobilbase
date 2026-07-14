-- AlterTable
ALTER TABLE "OfferPricingRule" ADD COLUMN "tenantId" TEXT;

CREATE INDEX "OfferPricingRule_tenantId_brand_idx" ON "OfferPricingRule"("tenantId", "brand");

ALTER TABLE "OfferPricingRule"
  ADD CONSTRAINT "OfferPricingRule_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
