-- AlterTable
ALTER TABLE "Product" ADD COLUMN "requiresSerialNumber" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OfferPricingRule" ADD COLUMN "requiresSerialNumber" BOOLEAN NOT NULL DEFAULT true;
