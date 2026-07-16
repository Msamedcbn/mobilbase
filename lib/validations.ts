import { z } from "zod";

export const customerSchema = z.object({
  nationalId: z.string().trim().length(11).regex(/^\d+$/).optional().or(z.literal("")).nullable(),
  fullName: z.string().trim().min(3),
  phone: z.string().trim().min(10),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative().optional(),
});

export const deviceSchema = z.object({
  customerId: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  storage: z.string().min(1),
  imei: z.string().trim().min(14).max(16).optional().or(z.literal("")).nullable(),
  color: z.string().optional().nullable(),
  conditionNote: z.string().optional().nullable(),
  isSecondHandStock: z.boolean().optional(),
});

export const posCheckoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    discountPct: z.number().min(0).max(100).default(0),
  })).min(1),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "ON_ACCOUNT", "INSTALLMENT"]),
  customerId: z.string().optional(),
  branchId: z.string().optional(),
  relatedBuybackId: z.string().optional(),
  tradeInRef: z.string().optional(),
  bankAccountId: z.string().optional(),
  installmentCount: z.number().int().positive().optional(),
  interestRate: z.number().nonnegative().optional(),
});

export const buybackWizardSchema = z.object({
  customerId: z.string().min(1),
  deviceId: z.string().min(1),
  nationalId: z.string().length(11),
  fullName: z.string().min(3),
  phone: z.string().min(10),
  brand: z.string().min(1),
  model: z.string().min(1),
  storage: z.string().min(1),
  imei: z.string().trim().min(14).max(16).optional().or(z.literal("")),
  screenCondition: z.enum(["excellent", "good", "bad"]),
  bodyCondition: z.enum(["excellent", "good", "bad"]),
  batteryHealth: z.enum(["above90", "between80_90", "below80"]),
  hasBrokenComponent: z.boolean(),
  offeredPrice: z.number().positive(),
});

const buybackStatusSchema = z.enum(["DRAFT", "APPROVED", "REJECTED", "COMPLETED"]);

export const buybackDealCreateSchema = z.object({
  customerId: z.string().min(1),
  deviceId: z.string().min(1),
  offeredPrice: z.number().positive(),
  agreedPrice: z.number().positive().optional(),
  status: buybackStatusSchema.default("DRAFT"),
  evaluationNote: z.string().max(1000).optional(),
});

export const buybackDealUpdateSchema = z.object({
  offeredPrice: z.number().positive().optional(),
  agreedPrice: z.number().positive().nullable().optional(),
  status: buybackStatusSchema.optional(),
  evaluationNote: z.string().max(1000).nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
});

export const reconciliationCreateSchema = z.object({
  buybackDealId: z.string().min(1),
  customerPrice: z.number().nonnegative(),
  companyPrice: z.number().nonnegative(),
  customerAnswers: z.record(z.any()).optional(),
  companyAnswers: z.record(z.any()).optional(),
  diffItems: z.array(z.any()).optional(),
  customerEmail: z.string().email().optional(),
});

export const reconciliationDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(1000).optional(),
});

export const erpSyncSchema = z.object({
  pricingRules: z.array(z.object({
    brand: z.string().min(1),
    modelPattern: z.string().optional().nullable(),
    basePrice: z.number().positive(),
    excellentBonusPct: z.number().min(0).max(1).optional(),
    goodBonusPct: z.number().min(0).max(1).optional(),
    badPenaltyPct: z.number().min(0).max(1).optional(),
    batteryHighPct: z.number().min(0).max(1).optional(),
    batteryLowPenalty: z.number().min(0).max(1).optional(),
    brokenPenaltyPct: z.number().min(0).max(1).optional(),
    isActive: z.boolean().optional(),
  })).default([]),
});

export const appUserCreateSchema = z.object({
  fullName: z.string().trim().min(3),
  email: z.string().email(),
  role: z.enum(["PLATFORM_OWNER", "ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]),
  password: z.string().min(8),
  isActive: z.boolean().optional(),
});

export const appUserUpdateSchema = z.object({
  fullName: z.string().trim().min(3).optional(),
  role: z.enum(["PLATFORM_OWNER", "ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

export const pdfSettingsSchema = z.object({
  template1DealerName: z.string().max(120),
  template1PartnerName: z.string().max(120),
  template2CompanyTradeName: z.string().max(180),
  template2CompanyTaxInfo: z.string().max(180),
  template2CompanyAddress: z.string().max(500),
  template2CompanyPhone: z.string().max(60),
  template2MaterialType: z.string().max(120),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().optional().nullable(),
  brand: z.string().trim().optional().nullable(),
  model: z.string().trim().optional().nullable(),
  variantColor: z.string().trim().optional().nullable(),
  variantStorage: z.string().trim().optional().nullable(),
  condition: z.string().trim().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
  dealerPrice: z.number().nonnegative().nullable().optional(),
  wholesalePrice: z.number().nonnegative().nullable().optional(),
  images: z.array(z.string().url().or(z.string().startsWith("/"))).optional().nullable(),
});

export const productVariantSchema = z.object({
  size: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  barcode: z.string().trim().optional(),
  stock: z.number().int().nonnegative().default(0),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
});

export const productVariantUpdateSchema = z.object({
  size: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  stock: z.number().int().nonnegative().optional(),
  purchasePrice: z.number().nonnegative().nullable().optional(),
  salePrice: z.number().nonnegative().nullable().optional(),
});

export const tradeInQuoteSchema = z.object({
  buybackCredit: z.number().nonnegative(),
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

export const tradeInCheckoutSchema = z.object({
  buybackCredit: z.number().nonnegative(),
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "ON_ACCOUNT"]).default("CASH"),
  customerId: z.string().optional(),
  branchId: z.string().optional(),
  note: z.string().optional(),
});
