import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type CardInstallmentConfig = {
  brandId: string; // e.g. "bonus", "world", "maximum", "axess", "paraf", "cardfinans", "bankkart"
  brandName: string;
  isActive: boolean;
  installments: Array<{
    count: number;
    isActive: boolean;
    rate: number;
    plusInstallment: number;
  }>;
};

export type LocalStore = {
  users?: Array<{
    id: string;
    fullName: string;
    email: string;
    role: "ADMIN" | "CASHIER" | "TECHNICIAN";
    passwordHash: string;
    isActive: boolean;
    branchId: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  customers: Array<{ id: string; nationalId: string | null; fullName: string; phone: string; email: string | null; notes: string | null; creditLimit?: number }>;
  devices: Array<{ id: string; customerId: string; brand: string; model: string; storage: string; imei: string | null; serialNumber?: string | null; color: string | null; conditionNote: string | null; isSecondHandStock: boolean }>;
  buybacks: Array<{ id: string; customerId: string; deviceId: string; offeredPrice: number; agreedPrice: number | null; status: "DRAFT" | "APPROVED" | "REJECTED" | "COMPLETED"; reconciliationStatus: "NONE" | "SENT" | "VIEWED" | "APPROVED" | "REJECTED" | "EXPIRED"; evaluationNote: string | null; bankAccountId?: string | null; createdAt?: string; updatedAt?: string }>;
  pricingRules: Array<{ id: string; brand: string; modelPattern: string | null; basePrice: number; minPrice?: number | null; maxPrice?: number | null; excellentBonusPct: number; goodBonusPct: number; badPenaltyPct: number; batteryHighPct: number; batteryLowPenalty: number; brokenPenaltyPct: number; isActive: boolean }>;
  buybackCatalog?: Array<{ id: string; category: string; brand: string; model: string; basePrice: number; minPrice: number; questionSetJson: string }>;
  reconciliations: Array<{ id: string; token: string; buybackDealId: string; customerPrice: number; companyPrice: number; differenceAmount: number; status: "SENT" | "VIEWED" | "APPROVED" | "REJECTED" | "EXPIRED"; tokenExpiresAt: string; customerNote: string | null }>;
  notifications?: Array<{ id: string; buybackDealId: string; eventType: string; recipient: string; subject: string; bodyHtml: string; status: "QUEUED" | "SENT" | "FAILED"; errorMessage: string | null; contextJson: string | null; createdAt: string; sentAt: string | null }>;
  accountEntries?: Array<{ id: string; customerId: string; type: "DEBIT" | "CREDIT"; amount: number; description: string | null; createdAt: string; bankAccountId?: string | null }>;
  branches?: Array<{ id: string; name: string; address: string | null; phone: string | null }>;
  productBranchStocks?: Array<{ id: string; productId: string; branchId: string; stock: number }>;
  transactions?: Array<{ id: string; transactionNo: string; type: "INCOME" | "EXPENSE"; paymentMethod: "CASH" | "CREDIT_CARD" | "ON_ACCOUNT" | "INSTALLMENT"; customerId: string | null; totalAmount: number; note: string | null; createdAt: string; branchId?: string | null; bankAccountId?: string | null }>;
  repairs?: Array<{ id: string; deviceId: string; issueDescription: string; diagnosisNote: string | null; laborCost: number; partCost: number; totalCost: number; status: "RECEIVED" | "IN_PROGRESS" | "WAITING_PART" | "READY" | "DELIVERED" | "CANCELED"; receivedAt: string; completedAt: string | null; branchId?: string | null; createdAt?: string }>;
  bankAccounts?: Array<{ id: string; name: string; iban: string | null; balance: number; createdAt: string }>;
  installmentSales?: Array<{
    id: string;
    transactionNo: string;
    customerId?: string | null;
    totalAmount: number;
    installmentCount: number;
    interestRate: number;
    remainingAmount: number;
    createdAt: string;
    installments: Array<{
      id: string;
      installmentNo: number;
      dueDate: string;
      amount: number;
      status: "PAID" | "UNPAID";
      paidAt?: string | null;
      bankAccountId?: string | null;
      note?: string | null;
    }>;
  }>;
  cardInstallmentConfigs?: CardInstallmentConfig[];
  settings?: {
    id: string;
    whatsappEnabled: boolean;
    whatsappNumber: string | null;
    repairTemplate: string | null;
    veresiyeTemplate: string | null;
    installmentTemplate: string | null;
  };
  stockItems?: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    quantity: number;
    purchasePrice: number;
    salePrice: number;
    minThreshold: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  transferLogs?: Array<{
    id: string;
    productId: string;
    productName: string;
    sourceBranchId: string;
    sourceBranchName: string;
    targetBranchId: string;
    targetBranchName: string;
    quantity: number;
    createdAt: string;
  }>;
  stockLogs?: Array<{
    id: string;
    action: string;
    entityId: string;
    detail: string;
    createdAt: string;
  }>;
  resellerPricing?: {
    Lite: number;
    Pro: number;
    Enterprise: number;
    freeBranchLimit: number;
    branchSurchargePrice: number;
    addons?: {
      apiPackPrice: number;
      dbGbPrice: number;
      customDevHourly: number;
      annualDiscountPct: number;
    };
    features?: {
      Lite: {
        pos: boolean;
        repairs: boolean;
        stock: boolean;
        invoicing: boolean;
        buyback: boolean;
        supportLevel: string;
      };
      Pro: {
        pos: boolean;
        repairs: boolean;
        stock: boolean;
        invoicing: boolean;
        buyback: boolean;
        supportLevel: string;
      };
      Enterprise: {
        pos: boolean;
        repairs: boolean;
        stock: boolean;
        invoicing: boolean;
        buyback: boolean;
        supportLevel: string;
      };
    };
  };
  resellerExpenses?: Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
  }>;
};

const STORE_PATH = path.join(process.cwd(), "data", "local-store.json");

const seedStore: LocalStore = {
  users: [
    {
      id: "demo-user-admin",
      fullName: "Sistem Yoneticisi",
      email: "admin@telefoncupro.local",
      role: "ADMIN",
      passwordHash: "$2a$10$XUa5B09N/qf9pE4a1hGZxe/zUu9r.b91YyP9fL6gU8Z4R8yTz6H0G",
      isActive: true,
      branchId: "branch-kadikoy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  customers: [{ id: "demo-cust-1", nationalId: "11111111111", fullName: "Demo Musteri", phone: "5550000000", email: null, notes: null, creditLimit: 5000 }],
  devices: [{ id: "demo-dev-1", customerId: "demo-cust-1", brand: "Apple", model: "iPhone 13", storage: "128GB", imei: "355555555555555", serialNumber: "C39XYZ123ABC", color: null, conditionNote: null, isSecondHandStock: true }],
  buybacks: [{
    id: "demo-buy-1",
    customerId: "demo-cust-1",
    deviceId: "demo-dev-1",
    offeredPrice: 25000,
    agreedPrice: null,
    status: "DRAFT",
    reconciliationStatus: "NONE",
    evaluationNote: "DB disabled demo kaydi",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }],
  pricingRules: [{
    id: "demo-rule-1",
    brand: "Apple",
    modelPattern: "iPhone",
    basePrice: 28000,
    minPrice: 15000,
    maxPrice: 35000,
    excellentBonusPct: 0.2,
    goodBonusPct: 0,
    badPenaltyPct: 0.2,
    batteryHighPct: 0.08,
    batteryLowPenalty: 0.18,
    brokenPenaltyPct: 0.3,
    isActive: true,
  }],
  buybackCatalog: [],
  reconciliations: [],
  notifications: [],
  accountEntries: [],
  branches: [
    { id: "branch-kadikoy", name: "Kad1ky ^ubesi", address: "Kad1ky, 0stanbul", phone: "0216 111 22 33" },
    { id: "branch-besiktas", name: "Be_ikta_ ^ubesi", address: "Be_ikta_, 0stanbul", phone: "0212 222 33 44" }
  ],
  productBranchStocks: [
    { id: "stock-1", productId: "demo-prod-1", branchId: "branch-kadikoy", stock: 15 },
    { id: "stock-2", productId: "demo-prod-1", branchId: "branch-besiktas", stock: 5 },
    { id: "stock-3", productId: "demo-prod-2", branchId: "branch-kadikoy", stock: 20 },
    { id: "stock-4", productId: "demo-prod-2", branchId: "branch-besiktas", stock: 10 }
  ],
  transactions: [
    { id: "tr-seed-1", transactionNo: "POS-1716298000", type: "INCOME", paymentMethod: "CASH", customerId: "demo-cust-1", totalAmount: 12500, note: "POS Sat1_1", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), branchId: "branch-kadikoy" },
    { id: "tr-seed-2", transactionNo: "POS-1716298001", type: "INCOME", paymentMethod: "CREDIT_CARD", customerId: "demo-cust-1", totalAmount: 18000, note: "POS Sat1_1", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), branchId: "branch-besiktas" },
    { id: "tr-seed-3", transactionNo: "EXP-seed-1", type: "EXPENSE", paymentMethod: "CASH", customerId: null, totalAmount: 15000, note: "[Kategori: Kira] May1s Ay1 Dkkan Kiras1", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), branchId: "branch-kadikoy" },
    { id: "tr-seed-4", transactionNo: "EXP-seed-2", type: "EXPENSE", paymentMethod: "CREDIT_CARD", customerId: null, totalAmount: 2300, note: "[Kategori: Fatura] Elektrik Faturas1", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), branchId: "branch-kadikoy" }
  ],
  repairs: [
    {
      id: "rep-seed-1",
      deviceId: "demo-dev-1",
      issueDescription: "Ekran k1r1k, dokunmatik basm1yor",
      diagnosisNote: JSON.stringify({ checklist: { screen: "BAD", frontCam: "OK", backCam: "OK", wifi: "OK" }, note: "Ekran dei_imi yap1lacak." }),
      laborCost: 400,
      partCost: 1500,
      totalCost: 1900,
      status: "IN_PROGRESS",
      receivedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      branchId: "branch-kadikoy"
    },
    {
      id: "rep-seed-2",
      deviceId: "demo-dev-1",
      issueDescription: "Batarya ok abuk bitiyor, _i_me var",
      diagnosisNote: JSON.stringify({ checklist: { battery: "BAD", chargingPort: "OK" }, note: "Batarya dei_imi tamamland1." }),
      laborCost: 200,
      partCost: 600,
      totalCost: 800,
      status: "DELIVERED",
      receivedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      branchId: "branch-kadikoy"
    }
  ],
  bankAccounts: [
    { id: "bank-nakit", name: "Nakit Kasa", iban: null, balance: 15000, createdAt: new Date().toISOString() },
    { id: "bank-garanti", name: "Garanti Bankas1", iban: "TR123456789012345678901234", balance: 50000, createdAt: new Date().toISOString() }
  ],
  installmentSales: [],
  cardInstallmentConfigs: [
    {
      brandId: "bonus",
      brandName: "Bonus",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "world",
      brandName: "World",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "maximum",
      brandName: "Maximum",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "axess",
      brandName: "Axess",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "paraf",
      brandName: "Paraf",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "cardfinans",
      brandName: "CardFinans",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
    {
      brandId: "bankkart",
      brandName: "Bankkart",
      isActive: true,
      installments: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => ({
        count,
        isActive: count === 3 || count === 6 || count === 9,
        rate: count === 3 ? 3 : count === 6 ? 6 : count === 9 ? 9 : 0,
        plusInstallment: 0,
      })),
    },
  ],
  settings: {
    id: "default",
    whatsappEnabled: false,
    whatsappNumber: null,
    repairTemplate: null,
    veresiyeTemplate: null,
    installmentTemplate: null,
  },
  stockItems: [
    { id: "stock-item-1", sku: "SKU-IP11-SCR", name: "iPhone 11 Uyumlu A+ Ekran Modl", category: "Yedek Para", quantity: 12, purchasePrice: 450, salePrice: 1200, minThreshold: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "stock-item-2", sku: "SKU-IP13-BAT", name: "iPhone 13 Yksek Kapasiteli Batarya", category: "Yedek Para", quantity: 8, purchasePrice: 350, salePrice: 850, minThreshold: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: "stock-item-3", sku: "SKU-APL-LIG", name: "Lightning USB H1zl1 ^arj Kablosu 1m", category: "Aksesuar", quantity: 45, purchasePrice: 50, salePrice: 199, minThreshold: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  transferLogs: [],
  stockLogs: [
    { id: "stock-log-1", action: "STOCK_ADD", entityId: "stock-item-1", detail: "Stok Kart1 Eklendi: SKU-IP11-SCR - iPhone 11 Uyumlu A+ Ekran Modl (Adet: 12)", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: "stock-log-2", action: "STOCK_ADD", entityId: "stock-item-2", detail: "Stok Kart1 Eklendi: SKU-IP13-BAT - iPhone 13 Yksek Kapasiteli Batarya (Adet: 8)", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ],
  resellerPricing: {
    Lite: 750,
    Pro: 1500,
    Enterprise: 3500,
    freeBranchLimit: 5,
    branchSurchargePrice: 150,
    addons: {
      apiPackPrice: 150,
      dbGbPrice: 200,
      customDevHourly: 1200,
      annualDiscountPct: 15
    },
    features: {
      Lite: {
        pos: true,
        repairs: true,
        stock: false,
        invoicing: false,
        buyback: false,
        supportLevel: "Standart E-Posta Destek"
      },
      Pro: {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: false,
        supportLevel: "H1zl1 Destek (Mesai Saatleri)"
      },
      Enterprise: {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: true,
        supportLevel: "7/24 Telefon & SLA Destei"
      }
    }
  },
  resellerExpenses: [
    { id: "exp-1", category: "Altyap1/Sunucu", description: "AWS & Vercel Bulut Sunucu Altyap1 Bedeli", amount: 4200, date: "2026-05-15" },
    { id: "exp-2", category: "Personel Maa_lar1", description: "Yaz1l1m Geli_tirme & Teknik Destek Ekip Maa_lar1", amount: 65000, date: "2026-05-05" },
    { id: "exp-3", category: "Pazarlama/Reklam", description: "Google Ads & Meta SaaS Reklam Kampanyas1", amount: 8500, date: "2026-05-10" },
    { id: "exp-4", category: "Ofis/Dier", description: "Ofis Ortak Alan Kullan1m1 ve Muhasebe Giderleri", amount: 5000, date: "2026-05-02" },
    { id: "exp-5", category: "Altyap1/Sunucu", description: "Neon Database Postgres Kme creti", amount: 1800, date: "2026-05-18" }
  ]
};

export async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LocalStore;
    const maybeFix = (value: string) => {
      if (!/[]/.test(value)) return value;
      const repaired = Buffer.from(value, "latin1").toString("utf8");
      return /[_10^]/.test(repaired) ? repaired : value;
    };
    const deepFix = (input: unknown): unknown => {
      if (typeof input === "string") return maybeFix(input);
      if (Array.isArray(input)) return input.map((x) => deepFix(x));
      if (input && typeof input === "object") {
        const obj = input as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) out[k] = deepFix(v);
        return out;
      }
      return input;
    };

    const fixedParsed = deepFix(parsed) as LocalStore;
    return {
      ...seedStore,
      ...fixedParsed,
      users: fixedParsed.users || seedStore.users || [],
      customers: (fixedParsed.customers || []).map((c) => ({
        creditLimit: 0,
        ...c,
      })),
      accountEntries: fixedParsed.accountEntries || [],
      branches: fixedParsed.branches || seedStore.branches,
      productBranchStocks: fixedParsed.productBranchStocks || seedStore.productBranchStocks,
      transactions: fixedParsed.transactions || seedStore.transactions,
      repairs: fixedParsed.repairs || seedStore.repairs,
      notifications: fixedParsed.notifications || [],
      buybackCatalog: fixedParsed.buybackCatalog || [],
      bankAccounts: fixedParsed.bankAccounts || seedStore.bankAccounts,
      installmentSales: fixedParsed.installmentSales || [],
      cardInstallmentConfigs: fixedParsed.cardInstallmentConfigs || seedStore.cardInstallmentConfigs,
      settings: fixedParsed.settings || seedStore.settings,
      stockItems: fixedParsed.stockItems || seedStore.stockItems || [],
      transferLogs: fixedParsed.transferLogs || [],
      stockLogs: fixedParsed.stockLogs || seedStore.stockLogs || [],
      resellerPricing: fixedParsed.resellerPricing || seedStore.resellerPricing,
      resellerExpenses: fixedParsed.resellerExpenses || seedStore.resellerExpenses,
    };
  } catch {
    await writeLocalStore(seedStore);
    return seedStore;
  }
}

export async function writeLocalStore(state: LocalStore) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export function localId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
