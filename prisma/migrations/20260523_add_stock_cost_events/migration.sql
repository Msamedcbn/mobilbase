CREATE TYPE "StockCostEventType" AS ENUM (
  'PURCHASE_EXTERNAL',
  'INTERNAL_SELL_TO_SERVICE',
  'SERVICE_COST_LABOR',
  'SERVICE_COST_PART',
  'INTERNAL_BUYBACK_FROM_SERVICE',
  'MANUAL_ADJUSTMENT'
);

CREATE TABLE "StockCostEvent" (
  "id" TEXT NOT NULL,
  "stockItemId" TEXT NOT NULL,
  "type" "StockCostEventType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "costDelta" DECIMAL(10,2) NOT NULL,
  "unitCostAfter" DECIMAL(10,2) NOT NULL,
  "note" TEXT,
  "referenceNo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockCostEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockCostEvent_stockItemId_createdAt_idx" ON "StockCostEvent"("stockItemId", "createdAt");

ALTER TABLE "StockCostEvent"
  ADD CONSTRAINT "StockCostEvent_stockItemId_fkey"
  FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
