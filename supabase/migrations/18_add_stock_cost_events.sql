-- 18_add_stock_cost_events.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockCostEventType') THEN
    CREATE TYPE "StockCostEventType" AS ENUM (
      'PURCHASE_EXTERNAL',
      'INTERNAL_SELL_TO_SERVICE',
      'SERVICE_COST_LABOR',
      'SERVICE_COST_PART',
      'INTERNAL_BUYBACK_FROM_SERVICE',
      'MANUAL_ADJUSTMENT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StockCostEvent" (
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

CREATE INDEX IF NOT EXISTS "StockCostEvent_stockItemId_createdAt_idx" ON "StockCostEvent"("stockItemId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StockCostEvent_stockItemId_fkey'
  ) THEN
    ALTER TABLE "StockCostEvent"
      ADD CONSTRAINT "StockCostEvent_stockItemId_fkey"
      FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
