-- 08_buybacks.sql: Buyback Deals, Reconciliations, Notifications, and Pricing Rules
CREATE TABLE "BuybackDeal" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "offeredPrice" DECIMAL(10,2) NOT NULL,
    "agreedPrice" DECIMAL(10,2),
    "status" "BuybackStatus" NOT NULL DEFAULT 'DRAFT',
    "reconciliationStatus" "ReconciliationStatus" NOT NULL DEFAULT 'NONE',
    "evaluationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountId" TEXT,
    CONSTRAINT "BuybackDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuybackWizardData" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "productId" TEXT,
    "nationalId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "screenCondition" TEXT NOT NULL,
    "bodyCondition" TEXT NOT NULL,
    "batteryHealth" TEXT NOT NULL,
    "hasBrokenComponent" BOOLEAN NOT NULL,
    "offeredPrice" DECIMAL(10,2) NOT NULL,
    "contractApprovedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuybackWizardData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuybackReconciliation" (
    "id" TEXT NOT NULL,
    "buybackDealId" TEXT NOT NULL,
    "customerPrice" DECIMAL(10,2) NOT NULL,
    "companyPrice" DECIMAL(10,2) NOT NULL,
    "differenceAmount" DECIMAL(10,2) NOT NULL,
    "customerAnswers" TEXT,
    "companyAnswers" TEXT,
    "diffItems" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'SENT',
    "customerNote" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BuybackReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuybackNotification" (
    "id" TEXT NOT NULL,
    "buybackDealId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" "MailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "contextJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "BuybackNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferPricingRule" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelPattern" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "excellentBonusPct" DECIMAL(5,2) NOT NULL DEFAULT 0.20,
    "goodBonusPct" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "badPenaltyPct" DECIMAL(5,2) NOT NULL DEFAULT 0.20,
    "batteryHighPct" DECIMAL(5,2) NOT NULL DEFAULT 0.08,
    "batteryLowPenalty" DECIMAL(5,2) NOT NULL DEFAULT 0.18,
    "brokenPenaltyPct" DECIMAL(5,2) NOT NULL DEFAULT 0.30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OfferPricingRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuybackReconciliation_tokenHash_key" ON "BuybackReconciliation"("tokenHash");

ALTER TABLE "BuybackDeal" ADD CONSTRAINT "BuybackDeal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuybackDeal" ADD CONSTRAINT "BuybackDeal_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuybackDeal" ADD CONSTRAINT "BuybackDeal_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuybackWizardData" ADD CONSTRAINT "BuybackWizardData_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuybackWizardData" ADD CONSTRAINT "BuybackWizardData_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuybackWizardData" ADD CONSTRAINT "BuybackWizardData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuybackReconciliation" ADD CONSTRAINT "BuybackReconciliation_buybackDealId_fkey" FOREIGN KEY ("buybackDealId") REFERENCES "BuybackDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuybackReconciliation" ADD CONSTRAINT "BuybackReconciliation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BuybackNotification" ADD CONSTRAINT "BuybackNotification_buybackDealId_fkey" FOREIGN KEY ("buybackDealId") REFERENCES "BuybackDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
