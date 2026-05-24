CREATE TYPE "CorporateQuoteStatus" AS ENUM ('DRAFT','SENT','APPROVED','REJECTED','CANCELED');

CREATE TABLE "CorporateQuote" (
  "id" TEXT NOT NULL,
  "quoteNo" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "validUntil" TIMESTAMP(3),
  "status" "CorporateQuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "itemsJson" TEXT NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT,
  CONSTRAINT "CorporateQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorporateQuote_quoteNo_tenantId_key" ON "CorporateQuote"("quoteNo", "tenantId");
CREATE INDEX "CorporateQuote_tenantId_createdAt_idx" ON "CorporateQuote"("tenantId", "createdAt");

ALTER TABLE "CorporateQuote"
  ADD CONSTRAINT "CorporateQuote_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
