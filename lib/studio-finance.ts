export type PlanName = "Lite" | "Service" | "Pro" | "Enterprise";

export type BillingLedgerEntry = {
  id: string;
  type: "CHARGE" | "COLLECTION";
  category: "LICENSE" | "SUPPORT" | "CUSTOM_DEV" | "SMS_PACK";
  amount: number;
  description: string;
  date: string;
  dueDate?: string;
  status?: "PAID" | "UNPAID";
  referenceNo?: string;
  sourceModule?: "PRICING" | "BILLING" | "HELPDESK" | "AUTOMATION" | "MANUAL";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PricingModel = {
  Lite: number;
  Service: number;
  Pro: number;
  Enterprise: number;
  freeBranchLimit: number;
  branchSurchargePrice: number;
  addons?: {
    annualDiscountPct?: number;
    apiPackPrice?: number;
    dbGbPrice?: number;
    customDevHourly?: number;
  };
};

export function computeLicenseAmount(params: {
  plan: PlanName;
  branchLimit: number;
  durationMonths: number;
  pricing: PricingModel;
  applyAnnualDiscount?: boolean;
}) {
  const { plan, branchLimit, durationMonths, pricing, applyAnnualDiscount } = params;
  const baseMonthly =
    plan === "Lite"
      ? pricing.Lite
      : plan === "Service"
        ? pricing.Service
        : plan === "Pro"
          ? pricing.Pro
          : pricing.Enterprise;
  const extraBranchCount = Math.max(0, branchLimit - Number(pricing.freeBranchLimit || 0));
  const extraBranchMonthly = extraBranchCount * Number(pricing.branchSurchargePrice || 0);
  const gross = (baseMonthly + extraBranchMonthly) * durationMonths;
  const discountPct = applyAnnualDiscount ? Number(pricing.addons?.annualDiscountPct || 0) : 0;
  const discountAmount = gross * (discountPct / 100);
  const net = Math.round(gross - discountAmount);
  return {
    baseMonthly,
    extraBranchCount,
    extraBranchMonthly,
    gross,
    discountPct,
    discountAmount,
    net,
  };
}

export function normalizeLedgerEntry(input: Partial<BillingLedgerEntry>, fallbackDate = new Date().toISOString().split("T")[0]): BillingLedgerEntry {
  const nowIso = new Date().toISOString();
  const type = (input.type === "COLLECTION" ? "COLLECTION" : "CHARGE") as "CHARGE" | "COLLECTION";
  return {
    id: input.id || `ledger-${Date.now()}`,
    type,
    category: (input.category || "LICENSE") as BillingLedgerEntry["category"],
    amount: Number(input.amount || 0),
    description: String(input.description || "").trim(),
    date: input.date || fallbackDate,
    dueDate: type === "CHARGE" ? (input.dueDate || input.date || fallbackDate) : undefined,
    status: (input.status || (type === "CHARGE" ? "UNPAID" : "PAID")) as "PAID" | "UNPAID",
    referenceNo: input.referenceNo || `REF-${String(Date.now()).slice(-8)}`,
    sourceModule: (input.sourceModule || "MANUAL") as BillingLedgerEntry["sourceModule"],
    createdBy: input.createdBy || "SYSTEM",
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export function summarizeLedger(entries: BillingLedgerEntry[], today = new Date()) {
  const totalCharges = entries.filter((e) => e.type === "CHARGE").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalCollections = entries.filter((e) => e.type === "COLLECTION").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netBalance = totalCharges - totalCollections;

  const unpaid = entries.filter((e) => e.type === "CHARGE" && (e.status || "UNPAID") !== "PAID");
  const isPast = (d: string) => new Date(d).getTime() < today.getTime();
  const daysDiff = (d: string) => Math.ceil((new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const overdue = unpaid.filter((e) => isPast(e.dueDate || e.date));
  const dueIn7 = unpaid.filter((e) => {
    const dd = daysDiff(e.dueDate || e.date);
    return dd >= 0 && dd <= 7;
  });
  const dueIn30 = unpaid.filter((e) => {
    const dd = daysDiff(e.dueDate || e.date);
    return dd > 7 && dd <= 30;
  });

  return {
    totalCharges,
    totalCollections,
    netBalance,
    overdueAmount: overdue.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    overdueCount: overdue.length,
    dueIn7Amount: dueIn7.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    dueIn7Count: dueIn7.length,
    dueIn30Amount: dueIn30.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    dueIn30Count: dueIn30.length,
  };
}

export function makeRenewalSuggestion(params: {
  tenantName: string;
  plan: PlanName;
  branchLimit: number;
  licenseEnd: string;
  pricing: PricingModel;
  today?: Date;
}) {
  const today = params.today || new Date();
  const end = new Date(params.licenseEnd);
  const remainingDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const calc = computeLicenseAmount({
    plan: params.plan,
    branchLimit: params.branchLimit,
    durationMonths: 12,
    pricing: params.pricing,
    applyAnnualDiscount: true,
  });
  return {
    shouldSuggest: remainingDays <= 30,
    remainingDays,
    suggestedAmount: calc.net,
    description: `${params.plan} plani icin otomatik +12 ay yenileme onerisi (${params.tenantName})`,
  };
}
