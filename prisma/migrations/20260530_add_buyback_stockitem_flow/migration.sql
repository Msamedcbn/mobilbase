-- CreateEnum
CREATE TYPE "BuybackProcessStatus" AS ENUM ('SERVICE_TRANSFERRED', 'READY_FOR_SALE');

-- AlterTable
ALTER TABLE "StockItem"
ADD COLUMN "isBuybackItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "buybackProcessStatus" "BuybackProcessStatus",
ADD COLUMN "buybackSaleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "buybackDealId" TEXT;

-- CreateIndex
CREATE INDEX "StockItem_tenantId_isBuybackItem_idx" ON "StockItem"("tenantId", "isBuybackItem");

-- CreateIndex
CREATE INDEX "StockItem_buybackDealId_idx" ON "StockItem"("buybackDealId");

-- AddForeignKey
ALTER TABLE "StockItem"
ADD CONSTRAINT "StockItem_buybackDealId_fkey"
FOREIGN KEY ("buybackDealId") REFERENCES "BuybackDeal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
