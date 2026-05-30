ALTER TABLE public."StockItem"
ADD COLUMN IF NOT EXISTS "isBuybackItem" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "buybackSaleEnabled" boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "buybackDealId" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BuybackProcessStatus') THEN
    CREATE TYPE "BuybackProcessStatus" AS ENUM ('SERVICE_TRANSFERRED', 'READY_FOR_SALE');
  END IF;
END $$;

ALTER TABLE public."StockItem"
ADD COLUMN IF NOT EXISTS "buybackProcessStatus" "BuybackProcessStatus";

CREATE INDEX IF NOT EXISTS "StockItem_tenantId_isBuybackItem_idx"
  ON public."StockItem"("tenantId", "isBuybackItem");

CREATE INDEX IF NOT EXISTS "StockItem_buybackDealId_idx"
  ON public."StockItem"("buybackDealId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'StockItem'
      AND constraint_name = 'StockItem_buybackDealId_fkey'
  ) THEN
    ALTER TABLE public."StockItem"
      ADD CONSTRAINT "StockItem_buybackDealId_fkey"
      FOREIGN KEY ("buybackDealId") REFERENCES public."BuybackDeal"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
