"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { normalizeLedgerEntry } from "@/lib/studio-finance";
import { TrialHealthPanel } from "@/components/trial-health-panel";
import { ReasonPromptModal } from "@/components/reason-prompt-modal";
import { useConfirm } from "@/components/confirm-modal";

interface TicketMessage {
  sender: "Tenant" | "Admin";
  body: string;
  date: string;
}

interface Ticket {
  id: string;
  title: string;
  category: "BUG" | "FEATURE" | "BILLING" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  messages: TicketMessage[];
  assignee?: string;
}

interface BillingLedgerEntry {
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
}

interface LeadHistoryEntry {
  date: string;
  note: string;
  author: string;
}

interface CrmTask {
  id: string;
  type: "CALL" | "DEMO" | "FOLLOW_UP" | "OFFER_REVIEW" | "RENEWAL_TOUCH";
  title: string;
  description?: string;
  dueDate: string;
  ownerUserId?: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "SNOOZED";
  leadStatus?: "LEAD" | "NEGOTIATION" | "OFFER_SENT" | "WON" | "LOST";
  createdAt: string;
  updatedAt?: string;
  source?: "MANUAL" | "SUGGESTION";
}

interface SaasMetadata {
  isSaaS: boolean;
  isFrozen?: boolean;
  plan: "Lite" | "Service" | "Pro" | "Enterprise";
  licenseStart: string;
  licenseEnd: string;
  branchLimit: number;
  databaseSizeGb: number;
  smsQuota: number;
  smsUsed: number;
  leadStatus: "LEAD" | "NEGOTIATION" | "OFFER_SENT" | "WON" | "LOST";
  leadHistory: LeadHistoryEntry[];
  modules: {
    pos: boolean;
    repairs: boolean;
    stock: boolean;
    buyback: boolean;
    invoicing: boolean;
  };
  tickets: Ticket[];
  billingLedger: BillingLedgerEntry[];
  crmTasks?: CrmTask[];
  nextActionDate?: string;
  ownerUserId?: string;
  expectedDealAmount?: number;
  lostReason?: string;
  wonSource?: string;
  rolePermissions?: {
    PLATFORM_OWNER?: string[];
    ADMIN?: string[];
    MANAGER?: string[];
    CASHIER?: string[];
    TECHNICIAN?: string[];
    ACCOUNTANT?: string[];
  };
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  creditLimit: number;
}

interface CustomerDetailPayload {
  customer: Customer;
  saasMetadata: SaasMetadata;
  financialSummary?: {
    totalCharges: number;
    totalCollections: number;
    netBalance: number;
    overdueAmount: number;
    overdueCount: number;
    dueIn7Amount: number;
    dueIn7Count: number;
    dueIn30Amount: number;
    dueIn30Count: number;
  };
  devices: any[];
  accountEntries: any[];
  buybacks: any[];
  posSales: any[];
  repairs: any[];
}

type StudioReports = {
  asOf: string;
  kpis: {
    tenantCount: number;
    totalCharges: number;
    totalCollections: number;
    collectionRatePct: number;
    overdueAmount: number;
    overdueRatePct: number;
  };
  dueBuckets: {
    overdue: Array<any>;
    dueIn7: Array<any>;
    dueIn30: Array<any>;
  };
  riskTenants: Array<{ tenantId: string; tenantName: string; overdueAmount: number; remainingDays: number; reason: string }>;
  renewalSuggestions: Array<{ tenantId: string; tenantName: string; shouldSuggest: boolean; remainingDays: number; suggestedAmount: number; description: string }>;
  monthly: Array<{ month: string; charges: number; collections: number; byPlan: { Lite: number; Service: number; Pro: number; Enterprise: number } }>;
  pricingHistory: Array<any>;
  auditLogs: Array<any>;
};

type StudioSection = "portfolio" | "helpdesk" | "infrastructure" | "billing" | "logs" | "pricing";

function getStudioSectionFromPath(pathname: string): StudioSection | null {
  const section = pathname.split("/")[2];
  if (section === "helpdesk" || section === "infrastructure" || section === "billing" || section === "logs" || section === "pricing") {
    return section;
  }
  if (section === "portfolio") {
    return "portfolio";
  }
  return null;
}

const PLAN_PRICES = {
  Lite: 750,
  Service: 990,
  Pro: 1500,
  Enterprise: 3500,
};

const CANNED_REPLIES = [
  {
    id: "efatura",
    title: "E-Fatura Entegrasyonu Yardımı",
    body: "Değerli bayimiz, GİB e-fatura başvurusu icin öncelikle mali mühür almaniz gerekmektedir. Ardindan entegrasyon ayarları sekmesinden GIB bilgilerinizi doldurarak aktivasyonu tamamlayabilirsiniz. Sorularınız için teknik destek ekibimizle iletişime geçebilirsiniz."
  },
  {
    id: "sube_limiti",
    title: "Şube Limiti Uyarısı",
    body: "Sayın yetkili, lisans paketinizdeki şube limitinizi doldurduğunuz tespit edilmiştir. Sisteminizin kesintisiz çalışmaya devam edebilmesi icin bir ust paket olan Enterprise paketine gecmenizi öneririz. Paket yükseltme işlemi icin cari işlemler sekmesini kullanabilir veya bizimle irtibata geçebilirsiniz."
  },
  {
    id: "sms_aktif",
    title: "SMS Paketi Etkinleştirme",
    body: "Merhaba, satın almış olduğunuz SMS paketi hesabiniza tanımlanmış ve kotanız güncellenmiştir. SMS kullanım oranlarınızı ERP panelinden anlik olarak takip edebilirsiniz. Iyi çalışmalar dileriz."
  }
];

function StudioPageContent() {
  const { confirm, confirmDialog } = useConfirm();
  const [sessionRole, setSessionRole] = useState<"PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT" | "STUDIO_OPERATOR" | null>(null);
  const [tenants, setTenants] = useState<Customer[]>([]);
  const [loading, setLoadıng] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"ALL" | "Lite" | "Service" | "Pro" | "Enterprise">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Selected Tenant for the Console Modal
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [pendingReasonAction, setPendingReasonAction] = useState<
    | { type: "DELETE_TENANT"; id: string; name: string }
    | { type: "TENANT_ADMIN"; id: string; action: "FREEZE" | "UNFREEZE"; name: string }
    | { type: "EXTEND_LICENSE"; item: typeof tenantConfigs[0] }
    | null
  >(null);
  const [detailData, setDetailData] = useState<CustomerDetailPayload | null>(null);
  const [detailLoadıng, setDetailLoadıng] = useState(false);

  // Form states for the editing console
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPlan, setEditPlan] = useState<"Lite" | "Service" | "Pro" | "Enterprise">("Pro");
  const [editLicenseStart, setEditLicenseStart] = useState("");
  const [editLicenseEnd, setEditLicenseEnd] = useState("");
  const [editBranchLimit, setEditBranchLimit] = useState(5);
  const [editDatabaseSizeGb, setEditDatabaseSizeGb] = useState(0.5);
  const [editSmsQuota, setEditSmsQuota] = useState(5000);
  const [editSmsUsed, setEditSmsUsed] = useState(1200);
  const [editLeadStatus, setEditLeadStatus] = useState<SaasMetadata["leadStatus"]>("WON");
  const [editLeadHistory, setEditLeadHistory] = useState<LeadHistoryEntry[]>([]);
  const [editCrmTasks, setEditCrmTasks] = useState<CrmTask[]>([]);
  const [editNextActionDate, setEditNextActionDate] = useState("");
  const [editOwnerUserId, setEditOwnerUserId] = useState("");
  const [editExpectedDealAmount, setEditExpectedDealAmount] = useState(0);
  const [editLostReason, setEditLostReason] = useState("");
  const [editWonSource, setEditWonSource] = useState("");
  const [crmSuggestions, setCrmSuggestions] = useState<any[]>([]);
  const [crmInsights, setCrmInsights] = useState<any | null>(null);
  const [editModules, setEditModules] = useState({
    pos: true,
    repairs: true,
    stock: true,
    buyback: false,
    invoicing: false,
  });
  const [editTickets, setEditTickets] = useState<Ticket[]>([]);
  const [editBillingLedger, setEditBillingLedger] = useState<BillingLedgerEntry[]>([]);
  const [editRolePermissions, setEditRolePermissions] = useState<{
    PLATFORM_OWNER: string[];
    ADMIN: string[];
    MANAGER: string[];
    CASHIER: string[];
    TECHNICIAN: string[];
    ACCOUNTANT: string[];
  }>({
    PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
    ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
    MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
    CASHIER: ["pos"],
    TECHNICIAN: ["repairs"],
    ACCOUNTANT: ["invoicing"],
  });

  // Main tab and Helpdesk States
  const [mainTab, setMainTab] = useState<StudioSection>("portfolio");
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  const fetchTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const res = await fetch("/api/studio/infrastructure");
      if (res.ok) {
        const json = await res.json();
        setTelemetryData(json.telemetry || []);
      }
    } catch (err) {
      console.error("Error fetching telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === "infrastructure") {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 30000);
      return () => clearInterval(interval);
    }
  }, [mainTab]);

  const [selectedGlobalTicket, setSelectedGlobalTicket] = useState<{ tenantId: string; ticketId: string } | null>(null);
  const [globalReplyBody, setGlobalReplyBody] = useState("");

  // CRM filter state
  const [crmStatusFilter, setCrmStatusFilter] = useState<"ALL" | SaasMetadata["leadStatus"]>("ALL");

  // System Logs Tab Filter States
  const [logLevelFilter, setLogLevelFilter] = useState<"ALL" | "INFO" | "WARNING" | "ERROR">("ALL");
  const [logSearch, setLogSearch] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const routeSection = getStudioSectionFromPath(pathname);
    if (routeSection) {
      setMainTab(routeSection);
      return;
    }
    const tab = searchParams.get("tab");
    if (tab && ["portfolio", "helpdesk", "infrastructure", "billing", "logs", "pricing"].includes(tab)) {
      setMainTab(tab as any);
    }
  }, [pathname, searchParams]);

  // Console active tab state
  const [activeConsoleTab, setActiveConsoleTab] = useState<"GENERAL" | "CRM" | "TICKETS" | "ERP" | "ROLES" | "USERS" | "AUDIT">("GENERAL");

  // Tenant Users (kullanıcı bazlı modül override) state
  type TenantUser = {
    id: string;
    fullName: string;
    email: string;
    role: "PLATFORM_OWNER" | "ADMIN" | "MANAGER" | "CASHIER" | "TECHNICIAN" | "ACCOUNTANT";
    isActive: boolean;
    moduleOverrides: Record<string, boolean> | null;
  };
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [tenantUsersLoading, setTenantUsersLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Add Ticket State
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState<Ticket["category"]>("OTHER");
  const [newTicketStatus, setNewTicketStatus] = useState<Ticket["status"]>("OPEN");
  const [selectedTicketId, setSelectedTicketIdInsideModal] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Add Ledger Entry State
  const [ledgerType, setLedgerType] = useState<"CHARGE" | "COLLECTION">("CHARGE");
  const [ledgerCategory, setLedgerCategory] = useState<BillingLedgerEntry["category"]>("LICENSE");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");

  // Global Ledger Entry States (for Muhasebe Dashboard)
  const [globalLedgerTenantId, setGlobalLedgerTenantId] = useState("");
  const [globalLedgerType, setGlobalLedgerType] = useState<"CHARGE" | "COLLECTION">("CHARGE");
  const [globalLedgerCategory, setGlobalLedgerCategory] = useState<BillingLedgerEntry["category"]>("LICENSE");
  const [globalLedgerAmount, setGlobalLedgerAmount] = useState("");
  const [globalLedgerDesc, setGlobalLedgerDesc] = useState("");
  const [globalLedgerDate, setGlobalLedgerDate] = useState(new Date().toISOString().split("T")[0]);
  const [globalLedgerDueDate, setGlobalLedgerDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [isAddingGlobalLedger, setIsAddingGlobalLedger] = useState(false);

  // Add Lead Note State
  const [newLeadNote, setNewLeadNote] = useState("");

  // Add Company Modal State
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantPhone, setNewTenantPhone] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantInitialPassword, setNewTenantInitialPassword] = useState("");
  const [newTenantInitialRole, setNewTenantInitialRole] = useState<"PLATFORM_OWNER" | "ADMIN" | "MANAGER" | "CASHIER" | "TECHNICIAN" | "ACCOUNTANT">("MANAGER");
  const [newTenantPlan, setNewTenantPlan] = useState<"Lite" | "Service" | "Pro" | "Enterprise">("Pro");

  // Reseller Bookkeeping & Pricing States
  const [pricing, setPricing] = useState<{
    Lite: number;
    Service: number;
    Pro: number;
    Enterprise: number;
    freeBranchLimit: number;
    branchSurchargePrice: number;
    addons: {
      apiPackPrice: number;
      dbGbPrice: number;
      customDevHourly: number;
      annualDiscountPct: number;
    };
    features: {
      Lite: { pos: boolean; repairs: boolean; stock: boolean; invoicing: boolean; buyback: boolean; supportLevel: string };
      Service: { pos: boolean; repairs: boolean; stock: boolean; invoicing: boolean; buyback: boolean; supportLevel: string };
      Pro: { pos: boolean; repairs: boolean; stock: boolean; invoicing: boolean; buyback: boolean; supportLevel: string };
      Enterprise: { pos: boolean; repairs: boolean; stock: boolean; invoicing: boolean; buyback: boolean; supportLevel: string };
    };
  }>({
    Lite: 750,
    Service: 990,
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
      Lite: { pos: true, repairs: true, stock: false, invoicing: false, buyback: false, supportLevel: "Standart E-Posta Destek" },
      Service: { pos: false, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Teknik Servis Odakli Destek" },
      Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hizli Destek (Mesai Saatleri)" },
      Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 Telefon & SLA Desteği" }
    }
  });

  const [expenses, setExpenses] = useState<Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
  }>>([]);

  // Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Altyapi/Sunucu");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);

  // Pricing Form State
  const [editLitePrice, setEditLitePrice] = useState(750);
  const [editServicePrice, setEditServicePrice] = useState(990);
  const [editProPrice, setEditProPrice] = useState(1500);
  const [editEnterprisePrice, setEditEnterprisePrice] = useState(3500);
  const [editFreeBranchLimit, setEditFreeBranchLimit] = useState(5);
  const [editBranchSurcharge, setEditBranchSurcharge] = useState(150);
  const [editAddons, setEditAddons] = useState({
    apiPackPrice: 150,
    dbGbPrice: 200,
    customDevHourly: 1200,
    annualDiscountPct: 15
  });
  const [editFeatures, setEditFeatures] = useState({
    Lite: { pos: true, repairs: true, stock: false, invoicing: false, buyback: false, supportLevel: "Standart E-Posta Destek" },
    Service: { pos: false, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Teknik Servis Odakli Destek" },
    Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hizli Destek (Mesai Saatleri)" },
    Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 Telefon & SLA Desteği" }
  });
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricingChangeReason, setPricingChangeReason] = useState("");
  const [reports, setReports] = useState<StudioReports | null>(null);
  const [reportsLoadıng, setReportsLoadıng] = useState(false);

  // Gercek StudioAuditLog kayitlari (logStudioAction ile yazilir), /api/studio/reports
  // uzerinden zaten cekiliyor (bkz. reports.auditLogs, ayni fetch Portfoy sekmesinde de
  // kullaniliyor). Onceden burada kurgu sirket isimleriyle sabit mock veri vardi.
  const realLogs = useMemo(() => {
    const rows = reports?.auditLogs || [];
    return rows.map((l: any) => {
      const action = String(l.action || "");
      const level = /FAIL|ERROR|REJECT/i.test(action)
        ? "ERROR"
        : /EXPIR|OVERDUE|FROZEN|WARN/i.test(action)
          ? "WARNING"
          : "INFO";
      return {
        time: l.createdAt ? new Date(l.createdAt).toLocaleString("tr-TR") : "-",
        level,
        module: l.targetType || "SYSTEM",
        text: `${l.actor || "Sistem"} — ${action}${l.detail ? `: ${l.detail}` : ""}`,
      };
    });
  }, [reports]);

  const filteredLogs = useMemo(() => {
    return realLogs.filter((log) => {
      const matchesLevel = logLevelFilter === "ALL" || log.level === logLevelFilter;
      const matchesSearch = log.text.toLowerCase().includes(logSearch.toLowerCase()) || log.module.toLowerCase().includes(logSearch.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [realLogs, logLevelFilter, logSearch]);

  const canManagePricing = sessionRole === "ADMIN" || sessionRole === "PLATFORM_OWNER";
  const canManageFinance = sessionRole === "ADMIN" || sessionRole === "PLATFORM_OWNER";
  const isPlatformOwner = sessionRole === "PLATFORM_OWNER";
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; fullName: string; email: string; isActive: boolean }>>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamEmail, setNewTeamEmail] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");
  const [teamFormOpen, setTeamFormOpen] = useState(false);

  // Advanced Tenant Form States
  const [newTaxOffice, setNewTaxOffice] = useState("");
  const [newTaxNumber, setNewTaxNumber] = useState("");
  const [newAuthorizedPerson, setNewAuthorizedPerson] = useState("");
  const [newCity, setNewCity] = useState("Istanbul");
  const [newLicenseDuration, setNewLicenseDuration] = useState<1 | 3 | 6 | 12>(12); // months
  const [newTenantBranchLimit, setNewTenantBranchLimit] = useState(5);
  const [newTenantDbLimit, setNewTenantDbLimit] = useState(1);
  const [newTenantApiLimit, setNewTenantApiLimit] = useState(50000);
  const [newTenantModules, setNewTenantModules] = useState({
    pos: true,
    repairs: true,
    stock: true,
    buyback: false,
    invoicing: false,
  });

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/studio/pricing");
      if (res.ok) {
        const data = await res.json();
        setPricing(data);
        setEditLitePrice(data.Lite);
        setEditServicePrice(data.Service ?? 990);
        setEditProPrice(data.Pro);
        setEditEnterprisePrice(data.Enterprise);
        setEditFreeBranchLimit(data.freeBranchLimit);
        setEditBranchSurcharge(data.branchSurchargePrice);
        if (data.addons) setEditAddons(data.addons);
        if (data.features) setEditFeatures(data.features);
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/studio/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePricing) {
      toast.error("Bu islem icin yetkiniz yok.");
      return;
    }
    setIsSavingPricing(true);
    try {
      const res = await fetch("/api/studio/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Lite: Number(editLitePrice),
          Service: Number(editServicePrice),
          Pro: Number(editProPrice),
          Enterprise: Number(editEnterprisePrice),
          freeBranchLimit: Number(editFreeBranchLimit),
          branchSurchargePrice: Number(editBranchSurcharge),
          addons: editAddons,
          features: editFeatures,
          reason: pricingChangeReason,
          actor: "StudioAdmin",
        }),
      });
      if (res.ok) {
        toast.success("Fiyatlandırma ayarları başarıyla güncellendi.");
        await fetchPricing();
        await fetchTenants(); // Recalculate MRR
        await fetchReports();
        setPricingChangeReason("");
      } else {
        toast.error("Ayarlar kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi oluştu.");
    } finally {
      setIsSavingPricing(false);
    }
  };

  useEffect(() => {
    // Sync default limits/modules when selected plan changes in add tenant form
    if (newTenantPlan === "Enterprise") {
      setNewTenantBranchLimit(15);
      setNewTenantDbLimit(5.0);
      setNewTenantApiLimit(200000);
      setNewTenantModules({ pos: true, repairs: true, stock: true, buyback: true, invoicing: true });
    } else if (newTenantPlan === "Service") {
      setNewTenantBranchLimit(3);
      setNewTenantDbLimit(0.7);
      setNewTenantApiLimit(25000);
      setNewTenantModules({ pos: false, repairs: true, stock: true, buyback: false, invoicing: false });
    } else if (newTenantPlan === "Pro") {
      setNewTenantBranchLimit(5);
      setNewTenantDbLimit(1.0);
      setNewTenantApiLimit(50000);
      setNewTenantModules({ pos: true, repairs: true, stock: true, buyback: false, invoicing: true });
    } else {
      setNewTenantBranchLimit(2);
      setNewTenantDbLimit(0.2);
      setNewTenantApiLimit(10000);
      setNewTenantModules({ pos: true, repairs: true, stock: false, buyback: false, invoicing: false });
    }
  }, [newTenantPlan]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmount) {
      toast.error("Lütfen açıklama ve tutar giriniz.");
      return;
    }
    try {
      const res = await fetch("/api/studio/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseCategory,
          description: expenseDesc,
          amount: Number(expenseAmount),
          date: expenseDate,
        }),
      });
      if (res.ok) {
        toast.success("Gider kaydı başarıyla eklendi.");
        setExpenseDesc("");
        setExpenseAmount("");
        setIsAddExpenseOpen(false);
        await fetchExpenses();
      } else {
        toast.error("Gider kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi oluştu.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!(await confirm("Bu gider kaydini silmek istediğinize emin misiniz?", { danger: true, confirmLabel: "Sil" }))) return;
    try {
      const res = await fetch(`/api/studio/expenses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Gider kaydi silindi.");
        await fetchExpenses();
      } else {
        toast.error("Gider silinemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const handleAddGlobalLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFinance) {
      toast.error("Bu islem icin yetkiniz yok.");
      return;
    }
    if (!globalLedgerTenantId) {
      toast.error("Lütfen bir bayi seçin.");
      return;
    }
    const amountNum = Number(globalLedgerAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Gecerli bir tutar girin.");
      return;
    }
    if (!globalLedgerDesc) {
      toast.error("Lütfen açıklama girin.");
      return;
    }

    const tenant = tenantConfigs.find((c) => c.id === globalLedgerTenantId);
    if (!tenant) {
      toast.error("Bayi bulunamadı.");
      return;
    }

    setIsAddingGlobalLedger(true);

    const newEntry: BillingLedgerEntry = normalizeLedgerEntry({
      id: "ledger-" + Date.now(),
      type: globalLedgerType,
      category: globalLedgerCategory,
      amount: amountNum,
      description: globalLedgerDesc,
      date: globalLedgerDate || new Date().toISOString().split("T")[0],
      dueDate: globalLedgerType === "CHARGE" ? (globalLedgerDueDate || new Date().toISOString().split("T")[0]) : undefined,
      status: globalLedgerType === "CHARGE" ? "UNPAID" : "PAID",
      sourceModule: "BILLING",
      createdBy: "StudioAdmin",
    });

    const updatedMeta: SaasMetadata = {
      ...tenant.meta,
      billingLedger: [...(tenant.meta.billingLedger || []), newEntry],
    };

    try {
      const res = await fetch(`/api/studio/customers/${globalLedgerTenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: tenant.tenant.fullName,
          phone: tenant.tenant.phone,
          email: tenant.tenant.email,
          saasMetadata: updatedMeta,
        }),
      });

      if (res.ok) {
        toast.success("Cari işlem kaydedildi.");
        setGlobalLedgerAmount("");
        setGlobalLedgerDesc("");
        setGlobalLedgerDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        fetchTenants();
        fetchReports();
      } else {
        toast.error("Cari işlem kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    } finally {
      setIsAddingGlobalLedger(false);
    }
  };

  const handleCollectInvoice = async (tenantId: string, entryId: string) => {
    if (!canManageFinance) {
      toast.error("Bu islem icin yetkiniz yok.");
      return;
    }
    const tenant = tenantConfigs.find((c) => c.id === tenantId);
    if (!tenant) {
      toast.error("Bayi bulunamadı.");
      return;
    }

    const chargeIndex = tenant.meta.billingLedger.findIndex((e) => e.id === entryId);
    if (chargeIndex === -1) {
      toast.error("Fatura kaydi bulunamadı.");
      return;
    }

    const charge = tenant.meta.billingLedger[chargeIndex];
    if (!(await confirm(`"${charge.description}" tutarindaki ${charge.amount.toLocaleString()} TL faturayi tahsil etmek istiyor musunuz?`))) {
      return;
    }

    // Mark as PAID
    const updatedLedger = tenant.meta.billingLedger.map((e) => {
      if (e.id === entryId) {
        return { ...e, status: "PAID" as const, updatedAt: new Date().toISOString() };
      }
      return e;
    });

    // Create a matching COLLECTION entry
    const newCollection: BillingLedgerEntry = normalizeLedgerEntry({
      id: "ledger-" + Date.now(),
      type: "COLLECTION",
      category: charge.category,
      amount: charge.amount,
      description: `Tahsilat: ${charge.description}`,
      date: new Date().toISOString().split("T")[0],
      referenceNo: charge.referenceNo ? `${charge.referenceNo}-COL` : undefined,
      sourceModule: "BILLING",
      createdBy: "StudioAdmin",
      status: "PAID",
    });

    updatedLedger.push(newCollection);

    const updatedMeta: SaasMetadata = {
      ...tenant.meta,
      billingLedger: updatedLedger,
    };

    try {
      const res = await fetch(`/api/studio/customers/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: tenant.tenant.fullName,
          phone: tenant.tenant.phone,
          email: tenant.tenant.email,
          saasMetadata: updatedMeta,
        }),
      });

      if (res.ok) {
        toast.success("Tahsilat kaydi oluşturuldu ve fatura kapatildi.");
        fetchTenants();
        fetchReports();
      } else {
        toast.error("Tahsilat işlemi kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPricing();
    fetchExpenses();
    fetchReports();
    fetchCrmInsights();
    fetchAuthMe();
    fetchTeamMembers();
  }, []);

  const fetchTenants = async () => {
    setLoadıng(true);
    try {
      const res = await fetch("/api/studio/customers");
      if (res.ok) {
        const json = await res.json();
        setTenants(json.data || json);
      } else {
        toast.error("Firma listesi yuklenemedi.");
      }
    } catch {
      toast.error("Sunucu bağlantısi kurulamadı.");
    } finally {
      setLoadıng(false);
    }
  };

  const fetchTenantDetails = async (id: string) => {
    setDetailLoadıng(true);
    try {
      const res = await fetch(`/api/studio/customers/${id}`);
      if (res.ok) {
        const data: CustomerDetailPayload = await res.json();
        setDetailData(data);

        // Populate form states
        setEditName(data.customer.fullName);
        setEditPhone(data.customer.phone);
        setEditEmail(data.customer.email || "");
        setEditPlan(data.saasMetadata.plan);
        setEditLicenseStart(data.saasMetadata.licenseStart);
        setEditLicenseEnd(data.saasMetadata.licenseEnd);
        setEditBranchLimit(data.saasMetadata.branchLimit);
        setEditDatabaseSizeGb(data.saasMetadata.databaseSizeGb);
        setEditModules(data.saasMetadata.modules);
        setEditTickets(data.saasMetadata.tickets || []);
        setEditBillingLedger(data.saasMetadata.billingLedger || []);
        const rolePermissions = data.saasMetadata.rolePermissions;
        setEditRolePermissions({
          PLATFORM_OWNER: rolePermissions?.PLATFORM_OWNER ?? ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
          ADMIN: rolePermissions?.ADMIN ?? ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
          MANAGER: rolePermissions?.MANAGER ?? ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
          CASHIER: rolePermissions?.CASHIER ?? ["pos"],
          TECHNICIAN: rolePermissions?.TECHNICIAN ?? ["repairs"],
          ACCOUNTANT: rolePermissions?.ACCOUNTANT ?? ["invoicing"],
        });
        setEditSmsQuota(data.saasMetadata.smsQuota ?? 5000);
        setEditSmsUsed(data.saasMetadata.smsUsed ?? 0);
        setEditLeadStatus(data.saasMetadata.leadStatus ?? "WON");
        setEditLeadHistory(data.saasMetadata.leadHistory || []);
        setEditCrmTasks(data.saasMetadata.crmTasks || []);
        setEditNextActionDate(data.saasMetadata.nextActionDate || "");
        setEditOwnerUserId(data.saasMetadata.ownerUserId || "");
        setEditExpectedDealAmount(Number(data.saasMetadata.expectedDealAmount || 0));
        setEditLostReason(data.saasMetadata.lostReason || "");
        setEditWonSource(data.saasMetadata.wonSource || "");
      } else {
        toast.error("Firma detaylari alinamadı.");
      }
    } catch {
      toast.error("Firma detaylari yuklenirken hata oluştu.");
    } finally {
      setDetailLoadıng(false);
    }
  };

  const fetchTenantUsers = async (id: string) => {
    setTenantUsersLoading(true);
    try {
      const res = await fetch(`/api/studio/customers/${id}/users`);
      if (res.ok) {
        const data = await res.json();
        setTenantUsers(data.users || []);
      } else {
        toast.error("Kullanıcı listesi alınamadı.");
      }
    } catch {
      toast.error("Kullanıcı listesi yüklenirken hata oluştu.");
    } finally {
      setTenantUsersLoading(false);
    }
  };

  const updateUserModuleOverride = async (user: TenantUser, moduleKey: string, allowed: boolean | null) => {
    const nextOverrides = { ...(user.moduleOverrides || {}) };
    if (allowed === null) {
      delete nextOverrides[moduleKey];
    } else {
      nextOverrides[moduleKey] = allowed;
    }
    setSavingUserId(user.id);
    try {
      const res = await fetch(`/api/studio/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleOverrides: nextOverrides }),
      });
      if (res.ok) {
        setTenantUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, moduleOverrides: nextOverrides } : u)));
        toast.success("Kullanıcı yetkisi güncellendi.");
      } else {
        toast.error("Kullanıcı yetkisi güncellenemedi.");
      }
    } catch {
      toast.error("Sunucu bağlantısı kurulamadı.");
    } finally {
      setSavingUserId(null);
    }
  };

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantDetails(selectedTenantId);
      fetchCrmSuggestions(selectedTenantId);
      fetchTenantUsers(selectedTenantId);
      setActiveConsoleTab("GENERAL");
      setSelectedTicketIdInsideModal(null);
      setReplyBody("");
    } else {
      setDetailData(null);
      setTenantUsers([]);
    }
  }, [selectedTenantId]);

  const parseMetadata = (notes: string | null): SaasMetadata => {
    const defaultMeta: SaasMetadata = {
      isSaaS: true,
      isFrozen: false,
      plan: "Pro",
      licenseStart: "2026-01-01",
      licenseEnd: "2027-01-01",
      branchLimit: 5,
      databaseSizeGb: 0.5,
      smsQuota: 5000,
      smsUsed: 1200,
      leadStatus: "WON",
      leadHistory: [
        { date: "2026-05-18", note: "Sistem aktivasyonu yapildi.", author: "SuperAdmin" }
      ],
      modules: {
        pos: true,
        repairs: true,
        stock: true,
        buyback: false,
        invoicing: false,
      },
      rolePermissions: {
        PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
        ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
        MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
        CASHIER: ["pos"],
        TECHNICIAN: ["repairs"],
        ACCOUNTANT: ["invoicing"],
      },
      tickets: [],
      billingLedger: [],
      crmTasks: [],
      nextActionDate: "",
      ownerUserId: "",
      expectedDealAmount: 0,
      lostReason: "",
      wonSource: "",
    };

    if (!notes) return defaultMeta;
    try {
      const parsed = JSON.parse(notes);
      if (parsed && typeof parsed === "object" && parsed.isSaaS) {
        return {
          ...defaultMeta,
          ...parsed,
          modules: { ...defaultMeta.modules, ...(parsed.modules || {}) },
          leadHistory: parsed.leadHistory || defaultMeta.leadHistory,
          tickets: (parsed.tickets || []).map((t: any) => ({
            id: t.id || "t-" + Date.now(),
            title: t.title || "Destek Talebi",
            category: t.category || "OTHER",
            status: t.status || "OPEN",
            createdAt: t.createdAt || new Date().toISOString().split("T")[0],
            messages: t.messages || []
          })),
          billingLedger: (parsed.billingLedger || []).map((b: any) => ({
            id: b.id || "b-" + Date.now(),
            type: b.type || "CHARGE",
            category: b.category || "LICENSE",
            amount: Number(b.amount) || 0,
            description: b.description || "",
            date: b.date || new Date().toISOString().split("T")[0]
          })),
          crmTasks: parsed.crmTasks || [],
          nextActionDate: parsed.nextActionDate || "",
          ownerUserId: parsed.ownerUserId || "",
          expectedDealAmount: Number(parsed.expectedDealAmount || 0),
          lostReason: parsed.lostReason || "",
          wonSource: parsed.wonSource || "",
        };
      }
    } catch {}
    return defaultMeta;
  };

  const getLicenseStatus = (licenseEnd: string): "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" => {
    const now = new Date();
    const end = new Date(licenseEnd);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "EXPIRED";
    if (diffDays <= 30) return "NEAR_EXPIRY";
    return "ACTIVE";
  };

  const handleRevertPricing = async (historyId: string) => {
    if (!canManagePricing) {
      toast.error("Bu islem icin yetkiniz yok.");
      return;
    }
    try {
      const res = await fetch("/api/studio/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId, actor: "StudioAdmin" }),
      });
      if (!res.ok) {
        toast.error("Fiyatlandirma geri alinamadı.");
        return;
      }
      toast.success("Fiyatlandirma gecmis kaydina gore geri alindi.");
      await fetchPricing();
      await fetchReports();
      await fetchTenants();
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const handleCreateRenewalCharge = async (tenantId: string, suggestedAmount: number, description: string) => {
    if (!canManageFinance) {
      toast.error("Bu islem icin yetkiniz yok.");
      return;
    }
    const tenant = tenantConfigs.find((c) => c.id === tenantId);
    if (!tenant) return toast.error("Bayi bulunamadı.");
    const entry = normalizeLedgerEntry({
      id: "renew-" + Date.now(),
      type: "CHARGE",
      category: "LICENSE",
      amount: Number(suggestedAmount || 0),
      description: description || "Otomatik yenileme borclandirmasi",
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "UNPAID",
      sourceModule: "AUTOMATION",
      createdBy: "StudioAdmin",
    });
    const updatedMeta: SaasMetadata = {
      ...tenant.meta,
      billingLedger: [...(tenant.meta.billingLedger || []), entry],
    };
    try {
      const res = await fetch(`/api/studio/customers/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: tenant.tenant.fullName,
          phone: tenant.tenant.phone,
          email: tenant.tenant.email,
          saasMetadata: updatedMeta,
        }),
      });
      if (!res.ok) return toast.error("Yenileme borcu olusturulamadı.");
      toast.success("Yenileme borclandirmasi eklendi.");
      await fetchTenants();
      await fetchReports();
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoadıng(true);
      const res = await fetch("/api/studio/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setReportsLoadıng(false);
    }
  };

  const fetchCrmInsights = async () => {
    try {
      const res = await fetch("/api/studio/crm/insights");
      if (!res.ok) return;
      const data = await res.json();
      setCrmInsights(data);
    } catch {
      setCrmInsights(null);
    }
  };

  const fetchCrmSuggestions = async (tenantId: string) => {
    const tenant = tenantConfigs.find((t) => t.id === tenantId);
    if (!tenant) return;
    try {
      const res = await fetch("/api/studio/crm/tasks");
      if (!res.ok) return;
      const allTasks = await res.json();
      const openCount = (tenant.meta.tickets || []).filter((x: any) => x.status !== "RESOLVED").length;
      const lastContact = tenant.meta.leadHistory?.[0]?.date || "";
      const now = new Date();
      const lastDate = lastContact ? new Date(lastContact) : new Date("2000-01-01");
      const gap = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const draft: any[] = [];
      if (gap >= 3 && tenant.meta.leadStatus !== "WON" && tenant.meta.leadStatus !== "LOST") {
        draft.push({ type: "NO_CONTACT_3_DAYS", title: "3 gun temassiz lead" });
      }
      if (tenant.meta.leadStatus === "OFFER_SENT" && gap >= 2) {
        draft.push({ type: "OFFER_NO_RESPONSE", title: "Teklife donus yok" });
      }
      if ((tenant.meta.expectedDealAmount || 0) >= 20000) {
        draft.push({ type: "HIGH_MRR_CANDIDATE", title: "Yuksek MRR adayi" });
      }
      if (openCount > 0) {
        draft.push({ type: "TICKET_FOLLOW_UP", title: "Ticket sonrasi musteri temasi" });
      }
      const existing = (allTasks?.tasks || []).filter((t: any) => t.tenantId === tenantId && t.status !== "DONE");
      setCrmSuggestions(draft.filter((d) => !existing.some((e: any) => (e.title || "").toLowerCase().includes((d.title || "").toLowerCase()))));
    } catch {
      setCrmSuggestions([]);
    }
  };

  const fetchAuthMe = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;
      const data = await res.json();
      setSessionRole(data?.user?.role || null);
    } catch {
      setSessionRole(null);
    }
  };

  const fetchTeamMembers = async () => {
    setTeamLoading(true);
    try {
      const res = await fetch("/api/studio/team");
      if (!res.ok) return;
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch {
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  };

  const createTeamMember = async () => {
    if (newTeamName.trim().length < 3 || !newTeamEmail.trim() || newTeamPassword.length < 8) {
      toast.error("Ad (en az 3 karakter), e-posta ve en az 8 karakterli şifre girin.");
      return;
    }
    try {
      const res = await fetch("/api/studio/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newTeamName.trim(), email: newTeamEmail.trim(), password: newTeamPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Ekip üyesi eklenemedi.");
        return;
      }
      toast.success("Ekip üyesi eklendi.");
      setNewTeamName("");
      setNewTeamEmail("");
      setNewTeamPassword("");
      setTeamFormOpen(false);
      fetchTeamMembers();
      fetchReports();
    } catch {
      toast.error("Bağlantı hatası.");
    }
  };

  const getPlanBasePrice = useCallback((plan: SaasMetadata["plan"]) => {
    if (plan === "Lite") return pricing.Lite;
    if (plan === "Service") return pricing.Service;
    if (plan === "Pro") return pricing.Pro;
    if (plan === "Enterprise") return pricing.Enterprise;
    return 0;
  }, [pricing]);

  const getLicenseStatusBadge = (status: "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED") => {
    if (status === "EXPIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
          Suresi Doldu
        </span>
      );
    } else if (status === "NEAR_EXPIRY") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Yakinda Doluyor
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Aktif
        </span>
      );
    }
  };

  // Calculations for KPIs
  const tenantConfigs = useMemo(() => {
    return tenants.map((t) => {
      const meta = parseMetadata(t.notes);
      const status = getLicenseStatus(meta.licenseEnd);
      const planPrice = getPlanBasePrice(meta.plan);
      const mrr = planPrice + (meta.branchLimit > pricing.freeBranchLimit ? (meta.branchLimit - pricing.freeBranchLimit) * pricing.branchSurchargePrice : 0);
      
      const balance = meta.billingLedger.reduce(
        (sum, entry) => sum + (entry.type === "CHARGE" ? entry.amount : -entry.amount),
        0
      );

      const openTicketsCount = meta.tickets.filter((ticket) => ticket.status === "OPEN").length;

      // Churn risk calculation
      const daysRemaining = Math.max(0, Math.ceil((new Date(meta.licenseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const isNearExpiry = daysRemaining <= 30;
      
      const apiQuotaVal = meta.smsQuota ?? 5000;
      const apiUsedVal = meta.smsUsed ?? 0;
      const apiUsagePct = apiQuotaVal > 0 ? (apiUsedVal / apiQuotaVal) * 100 : 0;
      const isLowApiUsage = apiUsagePct < 5;

      const hasRecentNote = meta.leadHistory && meta.leadHistory.some((h: any) => {
        const noteTime = new Date(h.date).getTime();
        return (Date.now() - noteTime) <= 15 * 24 * 60 * 60 * 1000;
      });
      const noRecentNote = !hasRecentNote;

      const isChurnRisk = isNearExpiry && (isLowApiUsage || noRecentNote);
      let churnReason = "";
      if (isChurnRisk) {
        const reasons = [];
        if (isLowApiUsage) reasons.push(`API kullanimi %${apiUsagePct.toFixed(1)} < %5`);
        if (noRecentNote) reasons.push("son 15 gunde görüşme notu girilmemiş");
        churnReason = `Lisans bitişine ${daysRemaining} gun kaldi ve ` + reasons.join(" ve ");
      }

      return {
        id: t.id,
        tenant: t,
        meta,
        status,
        mrr,
        balance,
        openTicketsCount,
        isChurnRisk,
        churnReason,
      };
    });
  }, [tenants, pricing, getPlanBasePrice]);

  const leadPipeline = useMemo(() => {
    const counts = {
      LEAD: 0,
      NEGOTIATION: 0,
      OFFER_SENT: 0,
      WON: 0,
      LOST: 0,
    };
    tenantConfigs.forEach((item) => {
      const status = item.meta.leadStatus || "WON";
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [tenantConfigs]);

  const riskAlerts = useMemo(() => {
    type RiskAlert = { tenantId: string; tenantName: string; type: "Lisans" | "Ödeme" | "SLA"; reason: string };
    const alerts: RiskAlert[] = [];
    tenantConfigs.forEach((item) => {
      if (item.isChurnRisk) {
        alerts.push({ tenantId: item.id, tenantName: item.tenant.fullName, type: "Lisans", reason: item.churnReason });
      }
      if (item.balance > 0) {
        alerts.push({
          tenantId: item.id,
          tenantName: item.tenant.fullName,
          type: "Ödeme",
          reason: `${item.balance.toLocaleString("tr-TR")} TL vadesi geçmiş borç`,
        });
      }
      const openTickets = (item.meta.tickets || []).filter((t: any) => t.status === "OPEN" && t.createdAt);
      if (openTickets.length > 0) {
        const oldest = openTickets.reduce((min: any, t: any) => (new Date(t.createdAt).getTime() < new Date(min.createdAt).getTime() ? t : min));
        const hoursOpen = Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60));
        if (hoursOpen >= 48) {
          alerts.push({
            tenantId: item.id,
            tenantName: item.tenant.fullName,
            type: "SLA",
            reason: `${hoursOpen} saattir açık destek talebi var`,
          });
        }
      }
    });
    return alerts;
  }, [tenantConfigs]);

  const apiKpis = useMemo(() => {
    let totalQuota = 0;
    let totalUsed = 0;
    tenantConfigs.forEach((item) => {
      totalQuota += item.meta.smsQuota || 0;
      totalUsed += item.meta.smsUsed || 0;
    });
    return {
      totalQuota,
      totalUsed,
      pct: totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0,
    };
  }, [tenantConfigs]);

  const kpis = useMemo(() => {
    const totalTenants = tenantConfigs.length;
    const totalMRR = tenantConfigs.reduce((sum, item) => sum + item.mrr, 0);
    const totalReceivable = tenantConfigs.reduce((sum, item) => sum + Math.max(0, item.balance), 0);
    const totalOpenTickets = tenantConfigs.reduce((sum, item) => sum + item.openTicketsCount, 0);

    return {
      totalTenants,
      totalMRR,
      totalReceivable,
      totalOpenTickets,
    };
  }, [tenantConfigs]);

  const allTickets = useMemo(() => {
    const list: Array<{
      tenantId: string;
      tenantName: string;
      tenantPhone: string;
      tenantEmail: string | null;
      ticket: Ticket;
    }> = [];
    tenantConfigs.forEach((tc) => {
      (tc.meta.tickets || []).forEach((t) => {
        list.push({
          tenantId: tc.id,
          tenantName: tc.tenant.fullName,
          tenantPhone: tc.tenant.phone,
          tenantEmail: tc.tenant.email,
          ticket: t,
        });
      });
    });
    const statusWeight = {
      OPEN: 0,
      IN_PROGRESS: 1,
      RESOLVED: 2,
    };
    return list.sort((a, b) => {
      const wA = statusWeight[a.ticket.status] ?? 3;
      const wB = statusWeight[b.ticket.status] ?? 3;
      if (wA !== wB) return wA - wB;
      return new Date(b.ticket.createdAt).getTime() - new Date(a.ticket.createdAt).getTime();
    });
  }, [tenantConfigs]);

  const activeGlobalTicket = useMemo(() => {
    if (!selectedGlobalTicket) return null;
    return allTickets.find(
      (item) =>
        item.tenantId === selectedGlobalTicket.tenantId &&
        item.ticket.id === selectedGlobalTicket.ticketId
    );
  }, [allTickets, selectedGlobalTicket]);

  const handleUpdateGlobalTicket = async (
    tenantId: string,
    ticketId: string,
    updates: Partial<Ticket>,
    newMessageBody?: string
  ) => {
    const tenantConfig = tenantConfigs.find((tc) => tc.id === tenantId);
    if (!tenantConfig) {
      toast.error("Firma bulunamadı.");
      return;
    }

    const updatedTickets = (tenantConfig.meta.tickets || []).map((t) => {
      if (t.id === ticketId) {
        const updatedMsg = newMessageBody
          ? [
              ...(t.messages || []),
              {
                sender: "Admin" as const,
                body: newMessageBody,
                date: new Date().toISOString().split("T")[0],
              },
            ]
          : t.messages;

        return {
          ...t,
          ...updates,
          messages: updatedMsg,
        };
      }
      return t;
    });

    const saasMetadata: SaasMetadata = {
      ...tenantConfig.meta,
      tickets: updatedTickets,
    };

    try {
      const res = await fetch(`/api/studio/customers/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: tenantConfig.tenant.fullName,
          phone: tenantConfig.tenant.phone,
          email: tenantConfig.tenant.email,
          saasMetadata,
        }),
      });

      if (res.ok) {
        toast.success("Destek talebi güncellendi.");
        await fetchTenants();
      } else {
        toast.error("Bilet güncellenemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const filteredTenants = useMemo(() => {
    return tenantConfigs.filter((item) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        item.tenant.fullName.toLowerCase().includes(searchLower) ||
        item.tenant.phone.includes(searchLower) ||
        (item.tenant.email && item.tenant.email.toLowerCase().includes(searchLower));

      const matchesPlan = planFilter === "ALL" || item.meta.plan === planFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesCrmStatus = crmStatusFilter === "ALL" || item.meta.leadStatus === crmStatusFilter;

      return matchesSearch && matchesPlan && matchesStatus && matchesCrmStatus;
    });
  }, [tenantConfigs, search, planFilter, statusFilter, crmStatusFilter]);

  // Fast Reseller Actions in Table Row
  const quickUpdateTenant = async (
    id: string,
    updatedMeta: SaasMetadata,
    updatedCustomer: Partial<Customer>,
    action?: { actionType: string; reason: string }
  ) => {
    try {
      const res = await fetch(`/api/studio/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedCustomer,
          saasMetadata: updatedMeta,
          ...(action ?? {}),
        }),
      });

      if (res.ok) {
        toast.success("İşlem başarıyla güncellendi.");
        fetchTenants();
        fetchReports();
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "Hızlı güncelleme başarısız.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const handleQuickExtendLicense = (item: typeof tenantConfigs[0]) => {
    setPendingReasonAction({ type: "EXTEND_LICENSE", item });
  };

  const confirmExtendLicense = (item: typeof tenantConfigs[0], reason: string) => {
    const meta = { ...item.meta };
    const currentEnd = new Date(meta.licenseEnd);
    const newEnd = new Date(
      currentEnd.getTime() < Date.now()
        ? Date.now() + 365 * 24 * 60 * 60 * 1000
        : currentEnd.getTime() + 365 * 24 * 60 * 60 * 1000
    );
    
    meta.licenseEnd = newEnd.toISOString().split("T")[0];
    
    // Add annual charge (scaled with branch limit)
    const planPrice = getPlanBasePrice(meta.plan);
    const annualBase = planPrice * 12;
    const annualBranchSurcharge = (meta.branchLimit > pricing.freeBranchLimit ? (meta.branchLimit - pricing.freeBranchLimit) * pricing.branchSurchargePrice : 0) * 12;
    const price = annualBase + annualBranchSurcharge;
    meta.billingLedger = [
      ...meta.billingLedger,
      {
        id: "ledger-" + Date.now(),
        type: "CHARGE",
        category: "LICENSE",
        amount: price,
        description: `Hizli +1 Yil Lisans Uzatma (${meta.plan})`,
        date: new Date().toISOString().split("T")[0],
      }
    ];

    toast.info(`${item.tenant.fullName} lisansi 1 yil uzatiliyor...`);
    quickUpdateTenant(item.id, meta, { fullName: item.tenant.fullName }, { actionType: "QUICK_EXTEND", reason });
  };

  const handleQuickToggleModule = (item: typeof tenantConfigs[0], modKey: keyof SaasMetadata["modules"]) => {
    const meta = { ...item.meta };
    meta.modules = {
      ...meta.modules,
      [modKey]: !meta.modules[modKey],
    };

    toast.info(`${item.tenant.fullName} icin modül değiştiriliyor...`);
    quickUpdateTenant(item.id, meta, { fullName: item.tenant.fullName });
  };

  const handleDeleteTenant = (id: string, name: string) => {
    setPendingReasonAction({ type: "DELETE_TENANT", id, name });
  };

  const confirmDeleteTenant = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/studio/customers/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        toast.success("Firma ve tüm ilişkili veriler başarıyla silindi.");
        setSelectedTenantId(null);
        fetchTenants();
        fetchReports();
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || "Firma silinemedi.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleSaveTenantDetails = async () => {
    if (!selectedTenantId) return;

    const saasMetadata: SaasMetadata = {
      isSaaS: true,
      plan: editPlan,
      licenseStart: editLicenseStart,
      licenseEnd: editLicenseEnd,
      branchLimit: Number(editBranchLimit),
      databaseSizeGb: Number(editDatabaseSizeGb),
      smsQuota: Number(editSmsQuota),
      smsUsed: Number(editSmsUsed),
      leadStatus: editLeadStatus,
      leadHistory: editLeadHistory,
      nextActionDate: editNextActionDate,
      ownerUserId: editOwnerUserId,
      expectedDealAmount: Number(editExpectedDealAmount || 0),
      lostReason: editLostReason,
      wonSource: editWonSource,
      modules: editModules,
      tickets: editTickets,
      billingLedger: editBillingLedger,
      crmTasks: editCrmTasks,
      rolePermissions: editRolePermissions,
    };

    try {
      const res = await fetch(`/api/studio/customers/${selectedTenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editName,
          phone: editPhone,
          email: editEmail,
          saasMetadata,
        }),
      });

      if (res.ok) {
        toast.success("Firma lisans ve yapılandırma ayarlari güncellendi.");
        setSelectedTenantId(null);
        fetchTenants();
      } else {
        toast.error("Kaydetme işlemi başarısız oldu.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantPhone) {
      toast.error("Lütfen firma adı ve telefon bilgilerini doldurun.");
      return;
    }
    if (!newTenantEmail || !newTenantInitialPassword || newTenantInitialPassword.length < 6) {
      toast.error("Lütfen e-posta ve en az 6 karakterli ilk giriş şifresini girin.");
      return;
    }

    const start = new Date().toISOString().split("T")[0];
    const endDateObj = new Date();
    endDateObj.setMonth(endDateObj.getMonth() + newLicenseDuration);
    const end = endDateObj.toISOString().split("T")[0];

    const basePrice = getPlanBasePrice(newTenantPlan);
    const extraBranches = newTenantBranchLimit > pricing.freeBranchLimit ? (newTenantBranchLimit - pricing.freeBranchLimit) : 0;
    const extraBranchMonthlyPrice = extraBranches * pricing.branchSurchargePrice;
    const totalMonthlyPrice = basePrice + extraBranchMonthlyPrice;
    const totalRawPrice = totalMonthlyPrice * newLicenseDuration;
    
    // Apply discount if 12 months is selected
    const discountPct = newLicenseDuration === 12 ? (pricing.addons?.annualDiscountPct || 15) : 0;
    const finalAmount = Math.round(totalRawPrice * (1 - discountPct / 100));

    const saasMetadata = {
      isSaaS: true,
      plan: newTenantPlan,
      licenseStart: start,
      licenseEnd: end,
      branchLimit: newTenantBranchLimit,
      databaseSizeGb: newTenantDbLimit,
      smsQuota: newTenantApiLimit,
      smsUsed: 0,
      leadStatus: "WON",
      taxOffice: newTaxOffice,
      taxNumber: newTaxNumber,
      authorizedPerson: newAuthorizedPerson,
      city: newCity,
      leadHistory: [
        { 
          date: start, 
          note: `Sistem aktivasyonu yapildi. Plan: ${newTenantPlan}, Sure: ${newLicenseDuration} Ay, Şube Limiti: ${newTenantBranchLimit}, Yetkili: ${newAuthorizedPerson} (Sehir: ${newCity}, V.D.: ${newTaxOffice}, V.N.: ${newTaxNumber})`, 
          author: "SuperAdmin" 
        }
      ],
      modules: newTenantModules,
      tickets: [],
      crmTasks: [],
      nextActionDate: "",
      ownerUserId: "",
      expectedDealAmount: 0,
      lostReason: "",
      wonSource: "",
      billingLedger: [
        normalizeLedgerEntry({
          id: "bill-" + Date.now(),
          type: "CHARGE",
          category: "LICENSE",
          amount: finalAmount,
          description: `${newLicenseDuration} Aylik ${newTenantPlan} Lisans Screti ${newLicenseDuration === 12 ? `(%${discountPct} Yıllık Indirim Uygulandi)` : ""}`,
          date: start,
          dueDate: end,
          status: "UNPAID",
          sourceModule: "AUTOMATION",
          createdBy: "StudioAdmin",
        }),
      ],
    };

    try {
      const res = await fetch("/api/studio/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newTenantName,
          phone: newTenantPhone,
          email: newTenantEmail || "",
          authorizedPerson: newAuthorizedPerson || "",
          initialPassword: newTenantInitialPassword,
          initialUserRole: newTenantInitialRole,
          creditLimit: 0,
          notes: JSON.stringify(saasMetadata),
        }),
      });

      if (res.ok) {
        toast.success("Firma başarıyla sisteme eklendi ve lisanslandı.");
        setIsAddTenantOpen(false);
        setNewTenantName("");
        setNewTenantPhone("");
        setNewTenantEmail("");
        setNewTenantInitialPassword("");
        setNewTenantInitialRole("MANAGER");
        setNewTaxOffice("");
        setNewTaxNumber("");
        setNewAuthorizedPerson("");
        setNewCity("Istanbul");
        setNewLicenseDuration(12);
        fetchTenants();
      } else {
        toast.error("Firma eklenemedi.");
      }
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  // Lead History Helpers
  const addLeadHistoryEntry = () => {
    if (!newLeadNote.trim()) {
      toast.error("Lütfen bir not yazın.");
      return;
    }
    const newEntry: LeadHistoryEntry = {
      date: new Date().toISOString().split("T")[0],
      note: newLeadNote,
      author: "SuperAdmin",
    };
    setEditLeadHistory([newEntry, ...editLeadHistory]);
    setNewLeadNote("");
    toast.success("Aktivite notu eklendi (Kaydet butonuna basmayi unutmayin).");
  };

  const STATUS_ORDER: SaasMetadata["leadStatus"][] = ["LEAD", "NEGOTIATION", "OFFER_SENT", "WON", "LOST"];

  const handleMoveLeadStatus = (item: any, direction: "left" | "right") => {
    const currentStatus = item.meta.leadStatus || "WON";
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    let newIndex = currentIndex;
    if (direction === "left" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "right" && currentIndex < STATUS_ORDER.length - 1) {
      newIndex = currentIndex + 1;
    }
    if (newIndex !== currentIndex) {
      const nextStatus = STATUS_ORDER[newIndex];
      const missing: string[] = [];
      if (!item.meta.nextActionDate) missing.push("nextActionDate");
      if (!item.meta.ownerUserId) missing.push("owner");
      if (!item.meta.expectedDealAmount) missing.push("expectedDealAmount");
      if (!item.meta.leadHistory?.length) missing.push("stageReason");
      if (nextStatus === "LOST" && !item.meta.lostReason) missing.push("lostReason");
      if (nextStatus === "WON" && !item.meta.wonSource) missing.push("wonSource");
      if (missing.length) {
        toast.error(`Asama gecisi engellendi. Eksik alanlar: ${missing.join(", ")}`);
        return;
      }
      const updatedMeta = {
        ...item.meta,
        leadStatus: nextStatus,
        leadHistory: [
          {
            date: new Date().toISOString().split("T")[0],
            note: `Satış aşaması taşındı: ${currentStatus} -> ${nextStatus}`,
            author: "SuperAdmin"
          },
          ...(item.meta.leadHistory || [])
        ]
      };
      toast.info(`${item.tenant.fullName} durumu ${nextStatus} olarak güncelleniyor...`);
      quickUpdateTenant(item.id, updatedMeta, { fullName: item.tenant.fullName });
    }
  };

  const handleAssigneeChange = (ticketId: string, assignee: string) => {
    const updated = editTickets.map((t) =>
      t.id === ticketId ? { ...t, assignee } : t
    );
    setEditTickets(updated);
    toast.success("Temsilci atandi.");
  };

  const handleDownloadInvoicePDF = (
    entry: BillingLedgerEntry,
    tenantInfo?: { fullName: string; phone: string; email?: string | null }
  ) => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Tarayicinizin pop-up engelleyicisini kapatin.");
      return;
    }
    
    let fullName = tenantInfo?.fullName || editName;
    let phone = tenantInfo?.phone || editPhone;
    let email = tenantInfo?.email || editEmail;

    if (!tenantInfo) {
      const tc = tenantConfigs.find((c) =>
        c.meta.billingLedger.some((e) => e.id === entry.id)
      );
      if (tc) {
        fullName = tc.tenant.fullName;
        phone = tc.tenant.phone;
        email = tc.tenant.email || "";
      }
    }
    
    const invoiceNo = `FT-${entry.id.replace(/\D/g, "").slice(-6) || "001234"}`;
    const logoHtml = `<h1 style="color: #1c1917; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VibeGSM</h1>`;
    const title = entry.type === "CHARGE" ? "FATURA" : "TAHSILAT MAKBUZU";
    
    w.document.write(`
      <html>
        <head>
          <title>${title} - ${invoiceNo}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #1c1917; padding: 40px; line-height: 1.5; background-color: #fcfbf9; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e7e5e4; padding-bottom: 20px; }
            .details { margin-top: 30px; display: flex; justify-content: space-between; }
            .details div { width: 45%; }
            .details h3 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px; font-weight: 700; }
            .details p { margin: 0 0 5px 0; font-size: 13px; color: #44403c; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; }
            .table th, .table td { border-bottom: 1px solid #e7e5e4; padding: 12px; text-align: left; font-size: 13px; }
            .table th { background-color: #f5f5f4; font-weight: 700; color: #44403c; }
            .total-section { margin-top: 30px; text-align: right; }
            .total-section table { margin-left: auto; width: 300px; border-collapse: collapse; }
            .total-section td { padding: 8px 12px; font-size: 13px; color: #44403c; }
            .total-section tr.grand { font-weight: bold; font-size: 16px; color: #1c1917; border-top: 2px solid #1c1917; }
            .footer { margin-top: 80px; border-top: 1px solid #e7e5e4; padding-top: 20px; font-size: 11px; color: #a8a29e; text-align: center; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; background: #f5f5f4; padding: 10px; border-radıus: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e7e5e4;">
            <span style="font-size: 12px; font-weight: bold; color: #44403c;">Belge nizleme & Yazdirma Ekrani</span>
            <button onclick="window.print()" style="background: #1c1917; color: white; border: none; padding: 6px 16px; border-radıus: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">Yazdir / PDF Kaydet</button>
          </div>
          <div class="header">
            <div>
              ${logoHtml}
              <p style="font-size: 12px; color: #78716c; margin: 5px 0 0 0;">VibeGSM Bilişim Teknolojileri A.S.</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 20px; color: #1c1917; font-weight: 700;">${title}</h2>
              <p style="font-size: 12px; color: #78716c; margin: 5px 0 0 0;">No: ${invoiceNo}<br>Tarih: ${entry.date}</p>
            </div>
          </div>
          <div class="details">
            <div>
              <h3>Gonderen Firma</h3>
              <p><strong>VibeGSM Bilişim A.S.</strong></p>
              <p>Teknokent Plaza No: 45/A</p>
              <p>Kadıkoy / Istanbul</p>
              <p>destek@vibegsm.com</p>
            </div>
            <div>
              <h3>Alici Bayi</h3>
              <p><strong>${fullName}</strong></p>
              <p>Tel: ${phone}</p>
              <p>E-Posta: ${email || "-"}</p>
            </div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>Aciklama</th>
                <th>Kategori</th>
                <th style="text-align: right;">Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${entry.description}</td>
                <td>
                  ${
                    entry.category === "LICENSE"
                      ? "LISANS"
                      : entry.category === "SUPPORT"
                      ? "DESTEK"
                      : entry.category === "CUSTOM_DEV"
                      ? "GELISTIRME"
                      : entry.category === "SMS_PACK"
                      ? "SMS/API PAKETI"
                      : entry.category || "Hizmet Bedeli"
                  }
                </td>
                <td style="text-align: right;">${entry.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
              </tr>
            </tbody>
          </table>
          <div class="total-section">
            <table>
              <tr>
                <td>Ara Toplam:</td>
                <td>${entry.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
              </tr>
              <tr>
                <td>KDV (%20):</td>
                <td>${(entry.amount * 0.20).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
              </tr>
              <tr class="grand">
                <td>Genel Toplam:</td>
                <td>${(entry.amount * 1.20).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            Bu belge VibeGSM Studio simulasyon sisteminde oluşturulmuştur. Elektronik arşiv veya resmi fatura niteliği taşımamaktadır.
          </div>
        </body>
      </html>
    `);
    w.document.close();
  };

  const handleSendInvoiceEmail = (entry: BillingLedgerEntry) => {
    if (!editEmail) {
      toast.error("Lütfen önce bayinin e-posta adresini Genel sekmesinden tanımlayın.");
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `${editEmail} adresine e-posta fatura bildirimi hazirlaniyor...`,
        success: `${editEmail} adresine e-posta fatura bildirimi başarıyla gönderildi!`,
        error: 'Gönderim başarısız oldu.',
      }
    );
  };

  // Support Tickets Helpers
  const addSupportTicket = () => {
    if (!newTicketTitle.trim()) {
      toast.error("Lütfen talep başlığı girin.");
      return;
    }
    const newTicket: Ticket = {
      id: "ticket-" + Date.now(),
      title: newTicketTitle,
      category: newTicketCategory,
      status: newTicketStatus,
      createdAt: new Date().toISOString().split("T")[0],
      messages: [],
      assignee: "Boşta",
    };
    setEditTickets([...editTickets, newTicket]);
    setNewTicketTitle("");
    toast.success("Destek talebi oluşturuldu (Kaydet butonuna basmayi unutmayin).");
  };

  const addTicketMessage = (ticketId: string) => {
    if (!replyBody.trim()) return;
    const updated = editTickets.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          messages: [
            ...(t.messages || []),
            {
              sender: "Admin" as const,
              body: replyBody,
              date: new Date().toISOString().split("T")[0],
            },
          ],
        };
      }
      return t;
    });
    setEditTickets(updated);
    setReplyBody("");
    toast.success("Cevabiniz eklendi (Kaydet butonuna basmayi unutmayin).");
  };

  const handleTenantAdminAction = async (
    id: string,
    action: "FREEZE" | "UNFREEZE" | "RESET_PASSWORD",
    tenantName: string
  ) => {
    if (action === "RESET_PASSWORD") {
      const newPassword = window.prompt(`${tenantName} için yeni şifreyi girin (en az 6 karakter):`);
      if (!newPassword) return;
      const confirmPassword = window.prompt("Yeni şifreyi tekrar girin:");
      if (!confirmPassword) return;
      const reason = window.prompt("Bu şifre sıfırlamanın gerekçesi (en az 5 karakter):");
      if (!reason || reason.trim().length < 5) {
        toast.error("Gerekçe en az 5 karakter olmalı.");
        return;
      }
      await submitTenantAdminAction(id, { action, newPassword, confirmPassword, reason: reason.trim() });
      return;
    }
    setPendingReasonAction({ type: "TENANT_ADMIN", id, action, name: tenantName });
  };

  const submitTenantAdminAction = async (id: string, body: Record<string, string>) => {
    try {
      const res = await fetch(`/api/studio/customers/${id}/tenant-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || "İşlem başarısız.");
        return;
      }
      toast.success(payload.message || "İşlem tamamlandı.");
      fetchTenants();
      fetchReports();
      if (selectedTenantId === id) {
        fetchTenantDetails(id);
      }
    } catch {
      toast.error("Bağlantı hatası.");
    }
  };

  const handleConfirmPendingReasonAction = (reason: string) => {
    if (!pendingReasonAction) return;
    if (pendingReasonAction.type === "DELETE_TENANT") {
      confirmDeleteTenant(pendingReasonAction.id, reason);
    } else if (pendingReasonAction.type === "TENANT_ADMIN") {
      submitTenantAdminAction(pendingReasonAction.id, { action: pendingReasonAction.action, reason });
    } else if (pendingReasonAction.type === "EXTEND_LICENSE") {
      confirmExtendLicense(pendingReasonAction.item, reason);
    }
    setPendingReasonAction(null);
  };

  const createCrmTask = async (tenantId: string, payload: Partial<CrmTask>) => {
    try {
      const res = await fetch("/api/studio/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          type: payload.type || "FOLLOW_UP",
          title: payload.title || "CRM Görevi",
          description: payload.description || "",
          dueDate: payload.dueDate || new Date().toISOString().split("T")[0],
          ownerUserId: payload.ownerUserId || editOwnerUserId || "",
          status: payload.status || "OPEN",
          leadStatus: payload.leadStatus || editLeadStatus,
        }),
      });
      if (!res.ok) return toast.error("CRM gorevi olusturulamadı.");
      toast.success("CRM gorevi olusturuldu.");
      if (selectedTenantId) fetchTenantDetails(selectedTenantId);
      fetchCrmInsights();
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const updateCrmTask = async (tenantId: string, taskId: string, patch: Partial<CrmTask>) => {
    try {
      const res = await fetch(`/api/studio/crm/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...patch }),
      });
      if (!res.ok) return toast.error("Görev güncellenemedi.");
      if (selectedTenantId) fetchTenantDetails(selectedTenantId);
      fetchCrmInsights();
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const applyCrmSuggestion = async (tenantId: string, suggestionType: string) => {
    try {
      const res = await fetch("/api/studio/crm/suggestions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, suggestionType }),
      });
      if (!res.ok) {
        toast.error("Oneri uygulanamadı.");
        return;
      }
      toast.success("Oneriden gorev olusturuldu.");
      if (selectedTenantId) {
        fetchTenantDetails(selectedTenantId);
        fetchCrmSuggestions(selectedTenantId);
      }
      fetchCrmInsights();
    } catch {
      toast.error("Bağlantı hatasi.");
    }
  };

  const addSupportChargeFromTicket = (ticket: Ticket) => {
    const charge = normalizeLedgerEntry({
      id: "ledger-" + Date.now(),
      type: "CHARGE",
      category: "SUPPORT",
      amount: 500,
      description: `Destek talebi ucreti: ${ticket.title}`,
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "UNPAID",
      sourceModule: "HELPDESK",
      createdBy: "StudioAdmin",
      referenceNo: `TKT-${ticket.id.slice(-6)}`,
    });
    setEditBillingLedger((prev) => [...prev, charge]);
    toast.success("Ticket icin destek ucreti cari harekete eklendi (Kaydet butonuna basmayi unutmayin).");
  };

  // Billing Ledger Helpers
  const addLedgerEntry = () => {
    const amountNum = Number(ledgerAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Lütfen geçerli bir tutar girin.");
      return;
    }
    const newEntry: BillingLedgerEntry = normalizeLedgerEntry({
      id: "ledger-" + Date.now(),
      type: ledgerType,
      category: ledgerCategory,
      amount: amountNum,
      description: ledgerDesc || (ledgerType === "CHARGE" ? "Ek Hizmet Bedeli" : "deme Tahsilati"),
      date: new Date().toISOString().split("T")[0],
      dueDate: ledgerType === "CHARGE" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : undefined,
      sourceModule: "MANUAL",
      createdBy: "StudioAdmin",
    });
    setEditBillingLedger([...editBillingLedger, newEntry]);
    setLedgerAmount("");
    setLedgerDesc("");
    toast.success("Cari hareket eklendi (Kaydet butonuna basmayi unutmayin).");
  };

  const removeLedgerEntry = async (id: string) => {
    if (await confirm("Bu cari hareketi silmek istediğinize emin misiniz?", { danger: true, confirmLabel: "Sil" })) {
      setEditBillingLedger(editBillingLedger.filter((e) => e.id !== id));
      toast.success("Cari hareket listeden kaldirildi. Değişiklikleri kalici yapmak icin firma detayini kaydetmeyi unutmayin.");
    }
  };

  const modalNetBalance = useMemo(() => {
    return editBillingLedger.reduce(
      (sum, entry) => sum + (entry.type === "CHARGE" ? entry.amount : -entry.amount),
      0
    );
  }, [editBillingLedger]);

  const erpStats = useMemo(() => {
    const totals = {
      LICENSE: 0,
      SUPPORT: 0,
      CUSTOM_DEV: 0,
      SMS_PACK: 0,
    };
    let grandTotal = 0;
    
    editBillingLedger.forEach((entry) => {
      if (entry.type === "CHARGE") {
        const category = entry.category || "LICENSE";
        if (category in totals) {
          totals[category as keyof typeof totals] += entry.amount;
          grandTotal += entry.amount;
        }
      }
    });

    return {
      totals,
      grandTotal,
    };
  }, [editBillingLedger]);

  return (
    <div className="space-y-7 pb-16">
      {mainTab === "portfolio" && (
        <>
      {/* Page Title & Header */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(79,70,229,0.16),transparent_38%),linear-gradient(135deg,transparent,rgba(15,23,42,0.04))] md:block" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">Platform Operasyon Merkezi</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Bayi portföyü, lisans ve gelir kontrolü
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                VibeGSM kullanan bayilerin lisans durumu, finansal riski, CRM aşaması ve destek yükü tek kurumsal çalışma alanında izlenir.
              </p>
            </div>

            <button
              onClick={() => setIsAddTenantOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Yeni firma tanımla
            </button>
          </div>
        </div>
      </div>

      {/* SaaS Reseller KPIs Grid - White Clean Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {/* KPI 1 */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kayıtlı bayi / firma</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{kpis.totalTenants}</span>
          <span className="text-xs text-indigo-600 mt-2 block font-semibold">Bulut altyapısında aktif tenant</span>
        </div>

        {/* KPI 2 */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aylık gelir (MRR)</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">
            {kpis.totalMRR.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </span>
          <span className="text-xs text-emerald-600 mt-2 block font-semibold">Yinelenen aylık lisans geliri</span>
        </div>

        {/* KPI 3 */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Bekleyen lisans borcu</span>
          <span className="text-3xl font-extrabold text-amber-600 mt-2 block">
            {kpis.totalReceivable.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
          </span>
          <span className="text-xs text-amber-600 mt-2 block font-semibold">Toplam açık alacak bakiyesi</span>
        </div>

        {/* KPI 4 */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-rose-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Açık destek talepleri</span>
          <span className="text-3xl font-extrabold text-rose-600 mt-2 block">{kpis.totalOpenTickets}</span>
          <span className="text-xs text-rose-600 mt-2 block font-semibold">Çözüm bekleyen destek kayıtları</span>
        </div>

        {/* KPI 5: API Request Consumption */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2zM19 9H5V7h14v2zM5 15h14v2H5v-2zM3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Aylık API istek kotası</span>
          <span className="text-3xl font-extrabold text-blue-650 mt-2 block font-mono">
            {apiKpis.totalUsed.toLocaleString()} / {apiKpis.totalQuota.toLocaleString()}
          </span>
          <div className="mt-2 space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, apiKpis.pct)}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block">Tüketim oranı: %{apiKpis.pct}</span>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-16 h-16 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm10 8h8v-8h-8v8zM3 21h8v-6H3v6zm10-10h8V3h-8v8z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Lead -&gt; Won</span>
          <span className="text-3xl font-extrabold text-indigo-600 mt-2 block">
            %{Number(crmInsights?.kpis?.leadToWonConversionPct || 0).toFixed(1)}
          </span>
          <span className="text-xs text-indigo-600 mt-2 block font-semibold">Ortalama kazanma süresi: {crmInsights?.kpis?.averageTimeToWinDays || 0} gün</span>
        </div>
      </div>

      {riskAlerts.length > 0 && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50/40 p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-rose-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            Riskli Bayiler ({riskAlerts.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {riskAlerts.map((alert, i) => (
              <button
                key={`${alert.tenantId}-${alert.type}-${i}`}
                onClick={() => setSelectedTenantId(alert.tenantId)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-white hover:bg-rose-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${
                      alert.type === "Lisans"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : alert.type === "Ödeme"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {alert.type}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate">{alert.tenantName}</span>
                  <span className="text-[11px] text-slate-500 truncate">{alert.reason}</span>
                </div>
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {isPlatformOwner && (
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Ekip Üyeleri (Studio)</h3>
            <button
              onClick={() => setTeamFormOpen((v) => !v)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              {teamFormOpen ? "Vazgeç" : "+ Yeni Üye"}
            </button>
          </div>

          {teamFormOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <input className="field" placeholder="Ad Soyad" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              <input className="field" placeholder="E-posta" value={newTeamEmail} onChange={(e) => setNewTeamEmail(e.target.value)} />
              <input className="field" type="password" placeholder="Şifre (en az 8 karakter)" value={newTeamPassword} onChange={(e) => setNewTeamPassword(e.target.value)} />
              <button onClick={createTeamMember} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
                Ekle
              </button>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mb-3">
            Ekip üyeleri Studio&apos;ya salt okunur erişebilir — firma dondurma, silme, şifre sıfırlama, lisans/fiyat kaydetme gibi işlemleri yapamaz.
          </p>

          {teamLoading ? (
            <div className="text-xs text-slate-400">Yükleniyor...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-xs text-slate-400">Henüz ekip üyesi eklenmedi.</div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700">{m.fullName}</span>
                    <span className="text-[11px] text-slate-400 ml-2">{m.email}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${m.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                    {m.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Satış Hunisi (Sales Funnel) */}
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          Satış hunisi ve müşteri adayı takibi
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-blue-700">Müşteri adayı</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-blue-900">{leadPipeline.LEAD}</span>
              <span className="text-xs text-blue-650">firma</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-violet-700">Görüşülüyor</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-violet-900">{leadPipeline.NEGOTIATION}</span>
              <span className="text-xs text-violet-650">firma</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-700">Teklif Verildi</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-amber-900">{leadPipeline.OFFER_SENT}</span>
              <span className="text-xs text-amber-650">firma</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-700">Kazanıldı</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-900">{leadPipeline.WON}</span>
              <span className="text-xs text-emerald-650">aktif bayi</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-rose-700">Kaybedildi</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-rose-900">{leadPipeline.LOST}</span>
              <span className="text-xs text-rose-650">arşiv</span>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {mainTab === "portfolio" && (
        <TrialHealthPanel customers={tenants} />
      )}

      {mainTab === "portfolio" && (
        <>
          {/* Control / Filter Bar - Clean Light Mode */}
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">Portföy arama ve filtreleme</h4>
            <p className="mt-1 text-xs text-slate-500">Lisans, CRM durumu ve operasyon riski üzerinden bayi portföyünü daraltın.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">Sonuç: {filteredTenants.length} bayi</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
              placeholder="Firma adı, telefon veya e-posta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute top-3.5 left-3.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
            >
              <option value="ALL">Tüm lisans planları</option>
              <option value="Lite">Lite planı ({pricing.Lite} TL/ay)</option>
              <option value="Service">Servis Planı ({pricing.Service} TL/ay)</option>
              <option value="Pro">Pro Planı ({pricing.Pro} TL/ay)</option>
              <option value="Enterprise">Enterprise Planı ({pricing.Enterprise} TL/ay)</option>
            </select>
          </div>

          {/* License Status Filter */}
          <div>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tüm lisans durumları</option>
              <option value="ACTIVE">Lisansı aktif</option>
              <option value="NEAR_EXPIRY">Son 30 günü kalanlar</option>
              <option value="EXPIRED">Lisans süresi dolanlar</option>
            </select>
          </div>

          {/* CRM Status Filter */}
          <div>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
              value={crmStatusFilter}
              onChange={(e) => setCrmStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Tüm CRM durumları</option>
              <option value="LEAD">Müşteri adayı</option>
              <option value="NEGOTIATION">Görüşme aşaması</option>
              <option value="OFFER_SENT">Teklif iletildi</option>
              <option value="WON">Kazanıldı</option>
              <option value="LOST">Kaybedildi</option>
            </select>
          </div>
        </div>
      </div>
            {/* Tenants Table Grid - Highly Scannable, Interactive Module Badges & Quick Extension */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">SaaS bayi portföyü</h3>
            <span className="text-xs font-bold text-slate-500">Listelenen: {filteredTenants.length} bayi</span>
          </div>
          
          <div className="flex bg-slate-200/60 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Liste görünümü
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "kanban"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Kanban panosu
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
              <span className="text-slate-500 text-sm mt-3 block">Müşteri listesi çekiliyor...</span>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Aradığınız kriterlere uygun bayi bulunamadı.
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto -mx-6 -my-6">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                    <th className="px-6 py-4">Firma / Bayi Profili</th>
                    <th className="px-6 py-4">CRM / Durum</th>
                    <th className="px-6 py-4">Lisans Planı & Modüller</th>
                    <th className="px-6 py-4">API & Kaynak Tüketimi</th>
                    <th className="px-6 py-4">Lisans Bitiş / Süre</th>
                    <th className="px-6 py-4">Cari Bakiye & Destek</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((item) => {
                    const usagePct = (() => {
                      const start = new Date(item.meta.licenseStart).getTime();
                      const end = new Date(item.meta.licenseEnd).getTime();
                      const total = end - start;
                      const elapsed = Date.now() - start;
                      return Math.max(0, Math.min(100, (elapsed / total) * 100));
                    })();

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-all group">
                        {/* Firma / Bayi Profili */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.tenant.fullName}
                              </span>
                              {item.isChurnRisk && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                                  title={item.churnReason}
                                >
                                  Churn riski
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 font-mono mt-0.5">{item.tenant.phone}</span>
                            {item.tenant.email && <span className="text-xs text-slate-400 mt-0.5">{item.tenant.email}</span>}
                          </div>
                        </td>

                        {/* CRM / Durum */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {item.meta.leadStatus === "LEAD" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                                Müşteri adayı
                              </span>
                            )}
                            {item.meta.leadStatus === "NEGOTIATION" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold border border-violet-200">
                                Görüşülüyor
                              </span>
                            )}
                            {item.meta.leadStatus === "OFFER_SENT" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                Teklif Verildi
                              </span>
                            )}
                            {item.meta.leadStatus === "WON" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                Kazanıldı
                              </span>
                            )}
                            {item.meta.leadStatus === "LOST" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                                Kaybedildi
                              </span>
                            )}
                            {getLicenseStatusBadge(item.status)}
                            <span className="text-[10px] text-slate-500">Owner: {item.meta.ownerUserId || "UNASSIGNED"}</span>
                            <span className="text-[10px] text-slate-500">Next: {item.meta.nextActionDate || "-"}</span>
                          </div>
                        </td>

                        {/* Lisans Planı & Modüller */}
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              {item.meta.plan === "Enterprise" ? (
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  Enterprise
                                </span>
                              ) : item.meta.plan === "Pro" ? (
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  Pro
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                  Lite
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { key: "pos" as const, label: "POS" },
                                { key: "repairs" as const, label: "Tamir" },
                                { key: "stock" as const, label: "Stok" },
                                { key: "invoicing" as const, label: "Fatura" },
                              ].map((mod) => {
                                const isActive = item.meta.modules[mod.key];
                                return (
                                  <button
                                    key={mod.key}
                                    onClick={() => handleQuickToggleModule(item, mod.key)}
                                    title={`Tıklayarak ${mod.label} modülünü ${isActive ? "kapatın" : "açın"}`}
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border transition-all ${
                                      isActive
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                    }`}
                                  >
                                    {mod.label} {isActive ? "Açık" : "Kapalı"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        {/* SMS & Kaynak Tüketimi */}
                        <td className="px-6 py-4">
                          <div className="space-y-1.5 max-w-[150px]">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                              <span>API istek:</span>
                              <span className="font-mono text-slate-700">{item.meta.smsUsed?.toLocaleString() ?? 0} / {item.meta.smsQuota?.toLocaleString() ?? 5000}</span>
                            </div>
                            {(() => {
                              const used = item.meta.smsUsed || 0;
                              const quota = item.meta.smsQuota || 5000;
                              const pct = Math.min(100, quota > 0 ? (used / quota) * 100 : 0);
                              return (
                                <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      pct > 90 ? "bg-rose-500" : pct > 75 ? "bg-amber-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                              );
                            })()}
                            <div className="text-[10px] text-slate-400">
                              DB: <span className="font-mono text-slate-600 font-bold">{item.meta.databaseSizeGb} GB</span>  Şube: <span className="font-mono text-slate-600 font-bold">{item.meta.branchLimit}</span>
                            </div>
                          </div>
                        </td>

                        {/* Lisans Bitiş / Sure */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-mono font-bold text-slate-600">
                              {item.meta.licenseEnd}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  item.status === "EXPIRED"
                                    ? "bg-rose-500"
                                    : item.status === "NEAR_EXPIRY"
                                    ? "bg-amber-500"
                                    : "bg-indigo-600"
                                }`}
                                style={{ width: `${100 - usagePct}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Kalan Sure: {Math.max(0, Math.ceil((new Date(item.meta.licenseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} gun
                            </div>
                          </div>
                        </td>

                        {/* Cari Bakiye & Destek */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-mono font-bold text-sm">
                              <span className={item.balance > 0 ? "text-amber-600" : item.balance < 0 ? "text-emerald-600" : "text-slate-400"}>
                                {item.balance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                              </span>
                            </div>
                            <div>
                              {item.openTicketsCount > 0 ? (
                                <span className="inline-flex px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold animate-pulse">
                                  {item.openTicketsCount} Acik Destek
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Acik talep yok</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action buttons - Added Quick extend 1 year */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPlatformOwner && (
                              <>
                            <button
                              onClick={() =>
                                handleTenantAdminAction(
                                  item.id,
                                  item.meta.isFrozen ? "UNFREEZE" : "FREEZE",
                                  item.tenant.fullName
                                )
                              }
                              title={item.meta.isFrozen ? "Tenantı tekrar aktif et" : "Tenantı dondur"}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all active:scale-95 flex items-center gap-1 ${
                                item.meta.isFrozen
                                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                              }`}
                            >
                              <span>{item.meta.isFrozen ? "Aktif Et" : "Dondur"}</span>
                            </button>

                            <button
                              onClick={() => handleTenantAdminAction(item.id, "RESET_PASSWORD", item.tenant.fullName)}
                              title="Tenant ana kullanıcı şifresini sıfırla"
                              className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl font-bold text-xs border border-sky-200 transition-all active:scale-95 flex items-center gap-1"
                            >
                              <span>Şifre Sıfırla</span>
                            </button>

                            <button
                              onClick={() => handleQuickExtendLicense(item)}
                              title="Lisansi Hizli Olarak +1 Yil Uzat ve Faturasi Kes"
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-200 transition-all active:scale-95 flex items-center gap-1"
                            >
                              <span>+1 Yil</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTenant(item.id, item.tenant.fullName)}
                              title="Firmayı ve Tüm Verilerini Sil"
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition-all active:scale-95 flex items-center gap-1"
                            >
                              <span>Sil</span>
                            </button>
                              </>
                            )}

                            <button
                              onClick={() => setSelectedTenantId(item.id)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              Yönet (Console)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto min-w-[1000px] pb-4">
              {([
                { id: "LEAD" as const, title: "Müşteri Adayi (Lead)", color: "border-blue-200 bg-blue-50/20 text-blue-800" },
                { id: "NEGOTIATION" as const, title: "Görüşülüyor", color: "border-violet-200 bg-violet-50/20 text-violet-800" },
                { id: "OFFER_SENT" as const, title: "Teklif Iletildi", color: "border-amber-200 bg-amber-50/20 text-amber-800" },
                { id: "WON" as const, title: "Kazanildi (Aktif)", color: "border-emerald-200 bg-emerald-50/20 text-emerald-800" },
                { id: "LOST" as const, title: "Kaybedildi (Arşiv)", color: "border-rose-200 bg-rose-50/20 text-rose-800" },
              ]).map((col) => {
                const colTenants = filteredTenants.filter((t) => t.meta.leadStatus === col.id);
                return (
                  <div key={col.id} className="flex flex-col bg-slate-50/60 rounded-2xl border border-slate-200 p-3 min-h-[450px]">
                    <div className={`p-2 rounded-xl border mb-3 flex items-center justify-between font-bold text-xs ${col.color}`}>
                      <span>{col.title}</span>
                      <span className="px-2 py-0.5 rounded bg-white text-[10px] shadow-sm border border-slate-200/40">{colTenants.length}</span>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
                      {colTenants.length === 0 ? (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 italic">
                          Müşteri Yok
                        </div>
                      ) : (
                        colTenants.map((item) => {
                          const lastContact = item.meta.leadHistory?.[0];
                          const smsUsed = item.meta.smsUsed || 0;
                          const smsQuota = item.meta.smsQuota || 5000;
                          const smsPct = smsQuota > 0 ? Math.round((smsUsed / smsQuota) * 100) : 0;
                          
                          return (
                            <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all space-y-2.5 relative group/card">
                              {item.isChurnRisk && (
                                <span
                                  className="absolute top-2 right-2 text-xs cursor-help"
                                  title={item.churnReason}
                                >
                                  a
                                </span>
                              )}
                              <div>
                                <div className="font-bold text-slate-800 text-xs truncate pr-4">{item.tenant.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.tenant.phone}</div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.meta.plan === "Enterprise" ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-extrabold border border-amber-200">Enterprise</span>
                                ) : item.meta.plan === "Pro" ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-extrabold border border-indigo-200">Pro</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-650 text-[8px] font-extrabold border border-slate-200">Lite</span>
                                )}
                                {item.isChurnRisk && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[8px] font-bold border border-rose-200 animate-pulse"
                                    title={item.churnReason}
                                  >
                                    Churn Riski
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-semibold text-slate-500">
                                  <span>API Limit Kullanimi:</span>
                                  <span className="font-mono text-slate-700">%{smsPct}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1">
                                  <div className="bg-blue-505 bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(100, smsPct)}%` }}></div>
                                </div>
                              </div>

                              <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1.5">
                                <span className="font-bold text-slate-400">Son Not:</span>{" "}
                                <span className="italic" title={lastContact?.note}>
                                  {lastContact ? (lastContact.note.length > 25 ? lastContact.note.substring(0, 25) + "..." : lastContact.note) : "Kayit bulunmuyor"}
                                </span>
                                {lastContact && <div className="text-[8px] text-slate-400 font-mono mt-0.5">{lastContact.date}</div>}
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 gap-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLeadStatus(item, "left")}
                                    disabled={col.id === "LEAD"}
                                    className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:hover:bg-slate-50 text-[10px]"
                                    title="Sola Taxi"
                                  >
                                    
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLeadStatus(item, "right")}
                                    disabled={col.id === "LOST"}
                                    className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 disabled:hover:bg-slate-50 text-[10px]"
                                    title="Sağa Taşı"
                                  >
                                    
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedTenantId(item.id)}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-[9px] shadow-sm transition-all"
                                >
                                  Yönet
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

        </>
      )}

      {mainTab === "helpdesk" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[600px]">
          {/* Left Panel: Tickets List (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Destek Talepleri ({allTickets.length})</h3>
              <span className="text-[10px] text-slate-400 font-bold">ncelik: Acik Talepler</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-slate-100">
              {allTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Kayitli destek talebi bulunmuyor.
                </div>
              ) : (
                allTickets.map((item) => {
                  const isSelected =
                    selectedGlobalTicket?.tenantId === item.tenantId &&
                    selectedGlobalTicket?.ticketId === item.ticket.id;
                  return (
                    <button
                      key={`${item.tenantId}-${item.ticket.id}`}
                      onClick={() => {
                        setSelectedGlobalTicket({
                          tenantId: item.tenantId,
                          ticketId: item.ticket.id,
                        });
                        setGlobalReplyBody("");
                      }}
                      className={`w-full text-left p-4 transition-all flex flex-col gap-2 ${
                        isSelected
                          ? "bg-indigo-50/70 border-l-4 border-indigo-600"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs text-slate-900 truncate max-w-[150px]">
                          {item.tenantName}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">{item.ticket.createdAt}</span>
                      </div>
                      <div className="font-bold text-slate-700 text-xs truncate">{item.ticket.title}</div>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.ticket.category === "BUG" && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[8px] font-bold border border-rose-150">BUG</span>
                        )}
                        {item.ticket.category === "FEATURE" && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-bold border border-indigo-150">ISTEK</span>
                        )}
                        {item.ticket.category === "BILLING" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-bold border border-amber-150">FATURA</span>
                        )}
                        {item.ticket.category === "OTHER" && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-650 text-[8px] font-bold border border-slate-200">DIGER</span>
                        )}

                        {item.ticket.status === "OPEN" && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-650 text-[8px] font-extrabold border border-red-150 animate-pulse">A!IK</span>
                        )}
                        {item.ticket.status === "IN_PROGRESS" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[8px] font-extrabold border border-amber-150 font-bold">ISLEMDE</span>
                        )}
                        {item.ticket.status === "RESOLVED" && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-extrabold border border-emerald-150 font-bold">!ZSLDS</span>
                        )}
                        
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-semibold">
                          x {item.ticket.assignee || "Boşta"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Conversation workspace (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-white">
            {activeGlobalTicket ? (
              <div className="flex flex-col h-full justify-between">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider">
                      Destek Talebi Detaylari
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-0.5 truncate max-w-[400px]">
                      {activeGlobalTicket.ticket.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Bayi: <span className="text-slate-850 font-bold">{activeGlobalTicket.tenantName}</span>  Tel: {activeGlobalTicket.tenantPhone} {activeGlobalTicket.tenantEmail && ` E-posta: ${activeGlobalTicket.tenantEmail}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={activeGlobalTicket.ticket.assignee || "Boşta"}
                      onChange={(e) =>
                        handleUpdateGlobalTicket(
                          activeGlobalTicket.tenantId,
                          activeGlobalTicket.ticket.id,
                          { assignee: e.target.value }
                        )
                      }
                    >
                      <option value="Boşta">Temsilci Yok (Boşta)</option>
                      <option value="Ahmet Sevim (SuperAdmin)">Ahmet Sevim (SuperAdmin)</option>
                      <option value="Zeynep Yilmaz (Destek)">Zeynep Yilmaz (Destek)</option>
                    </select>

                    <select
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={activeGlobalTicket.ticket.status}
                      onChange={(e) =>
                        handleUpdateGlobalTicket(
                          activeGlobalTicket.tenantId,
                          activeGlobalTicket.ticket.id,
                          { status: e.target.value as any }
                        )
                      }
                    >
                      <option value="OPEN">A!IK</option>
                      <option value="IN_PROGRESS">ISLEMDE</option>
                      <option value="RESOLVED">!ZSLDS</option>
                    </select>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50 max-h-[350px]">
                  {(activeGlobalTicket.ticket.messages || []).length === 0 ? (
                    <div className="text-center text-slate-400 italic text-xs py-12">
                      Bu talepte henüz mesaj bulunmuyor. Bir yanıt yazarak iletişimi başlatın.
                    </div>
                  ) : (
                    (activeGlobalTicket.ticket.messages || []).map((msg, idx) => {
                      const isAdmin = msg.sender === "Admin";
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[75%] ${
                            isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          <span className="text-[9px] font-bold text-slate-400 mb-0.5">
                            {isAdmin ? "Destek Ekibi (Siz)" : `${activeGlobalTicket.tenantName} Temsilcisi`}  {msg.date}
                          </span>
                          <div
                            className={`p-3 rounded-2xl text-xs font-medium border shadow-sm ${
                              isAdmin
                                ? "bg-indigo-600 border-indigo-700 text-white rounded-tr-none"
                                : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                            }`}
                          >
                            {msg.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Canned replies & Message sending */}
                <div className="border-t border-slate-200 bg-white">
                  {/* Canned Replies row */}
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 font-sans">Hazir Sablon:</span>
                    <select
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-655 focus:outline-none"
                      onChange={(e) => {
                        const selected = CANNED_REPLIES.find((r) => r.id === e.target.value);
                        if (selected) {
                          setGlobalReplyBody(selected.body);
                        }
                        e.target.value = ""; // Reset dropdown
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Seciniz...</option>
                      {CANNED_REPLIES.map((r) => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>

                    <div className="flex gap-1.5 flex-wrap">
                      {CANNED_REPLIES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setGlobalReplyBody(r.body)}
                          className="px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-[9px] font-bold text-indigo-700 border border-indigo-200 transition-all"
                        >
                          {r.title.replace(" Yardımı", "").replace(" Uyarısı", "").replace(" Etkinleştirme", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 flex gap-3">
                    <input
                      type="text"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                      placeholder="Cevabinizi buraya yazın..."
                      value={globalReplyBody}
                      onChange={(e) => setGlobalReplyBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && globalReplyBody.trim()) {
                          handleUpdateGlobalTicket(
                            activeGlobalTicket.tenantId,
                            activeGlobalTicket.ticket.id,
                            {},
                            globalReplyBody
                          );
                          setGlobalReplyBody("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!globalReplyBody.trim()}
                      onClick={() => {
                        handleUpdateGlobalTicket(
                          activeGlobalTicket.tenantId,
                          activeGlobalTicket.ticket.id,
                          {},
                          globalReplyBody
                        );
                        setGlobalReplyBody("");
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-650 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
                    >
                      Cevapla
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center py-24 text-slate-405">
                <svg className="w-16 h-16 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h4 className="font-extrabold text-sm text-slate-700 font-sans">Destek Görüşme Alani</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm font-sans">
                  Gelen destek taleplerini okumak, yanitlamak, atamak ve bilet durumunu güncellemek için sol panelden bir destek talebi seçin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INFRASTRUCTURE TAB */}
      {mainTab === "infrastructure" && (() => {
        const latestMetric = telemetryData.length > 0 ? telemetryData[telemetryData.length - 1] : {
          cpuLoad: 34,
          memoryUsed: 3.2,
          memoryTotal: 8.0,
          apiRequestRate: 48,
        };
        return (
          <div className="space-y-6">
            {/* Altyapi Kapasite Kartlari */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Kart 1: Sube Doluluk Orani — gercek veri (tenantConfigs) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Toplam Şube Kullanımı</span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2 block">
                  {tenantConfigs.reduce((sum, item) => sum + item.meta.branchLimit, 0)} / 1000
                </span>
                <div className="mt-3 space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (tenantConfigs.reduce((sum, item) => sum + item.meta.branchLimit, 0) / 1000) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Aktif Kapasite: %{(tenantConfigs.reduce((sum, item) => sum + item.meta.branchLimit, 0) / 10).toFixed(1)}</span>
                </div>
              </div>

              {/* Kart 2: API Gateway Trafigi */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">API Ağ Trafiği</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700 animate-pulse">Live</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-indigo-600">{latestMetric.apiRequestRate} req/sec</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <span className="text-xs text-slate-500 mt-3 block font-semibold">API Gateway Yük Dengeli (Healthy)</span>
              </div>

              {/* Kart 3: Sunucu Yuku (CPU/RAM) */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Küme CPU / RAM Kullanımı</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700 animate-pulse">Live</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">%{latestMetric.cpuLoad}</span>
                  <span className="text-xs text-slate-500">CPU</span>
                  <span className="text-slate-300 mx-1">|</span>
                  <span className="text-2xl font-extrabold text-slate-900">{latestMetric.memoryUsed} GB</span>
                  <span className="text-xs text-slate-500">RAM</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 border border-slate-200">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${latestMetric.cpuLoad}%` }} ></div>
                </div>
              </div>

              {/* Kart 4: PostgreSQL Bağlantı Havuzu */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">PostgreSQL Bağlantı Havuzu</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-700 animate-pulse">Live</span>
                </div>
                <span className="text-3xl font-extrabold text-emerald-600 mt-2 block">{Math.round(latestMetric.cpuLoad * 0.5 + 10)} / 100 Havuz</span>
                <span className="text-xs text-emerald-600 mt-2 block font-semibold">0.4ms Ortalama Yanıt Süresi</span>
              </div>
            </div>

            {/* Grafikler ve Detayli Analitik */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPU & API Load Telemetry Chart */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">CPU Yükü & API Trafiği Trendi</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Son 30 Veri Noktası (5&apos;er dk)</span>
                </div>
                <div className="flex items-end justify-between h-48 pt-6 border-b border-slate-150 relative">
                  {telemetryData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">Veri yükleniyor...</div>
                  ) : (
                    telemetryData.map((pt, i) => (
                      <div key={i} className="group relative flex flex-col items-center flex-1 h-full justify-end px-0.5">
                        {/* CPU Bar */}
                        <div 
                          className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-blue-500 group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-300"
                          style={{ height: `${pt.cpuLoad}%` }}
                        />
                        {/* API Indicator Dot */}
                        <div 
                          className="absolute w-2 h-2 rounded-full bg-amber-500 border border-white shadow-sm z-10 pointer-events-none transition-all duration-300"
                          style={{ bottom: `calc(${Math.min(95, pt.apiRequestRate)}% - 4px)` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-xl z-20 w-32 text-center pointer-events-none">
                          <span className="font-bold border-b border-slate-700 pb-1 mb-1 block w-full">{pt.timestamp}</span>
                          <span className="flex justify-between w-full"><span>CPU:</span> <span>%{pt.cpuLoad}</span></span>
                          <span className="flex justify-between w-full"><span>API:</span> <span>{pt.apiRequestRate} req/s</span></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-1">
                  <span>{telemetryData[0]?.timestamp || "Başlangıç"}</span>
                  <span>Şimdi ({telemetryData[telemetryData.length - 1]?.timestamp || "Bitiş"})</span>
                </div>
              </div>

              {/* Memory Usage Telemetry Chart */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">RAM Kullanım Trendi</h4>
                  <span className="text-[10px] text-slate-400 font-bold">Son 30 Veri Noktası (5&apos;er dk)</span>
                </div>
                <div className="flex items-end justify-between h-48 pt-6 border-b border-slate-150 relative">
                  {telemetryData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">Veri yükleniyor...</div>
                  ) : (
                    telemetryData.map((pt, i) => {
                      const pct = (pt.memoryUsed / pt.memoryTotal) * 100;
                      return (
                        <div key={i} className="group relative flex flex-col items-center flex-1 h-full justify-end px-0.5">
                          {/* RAM Bar */}
                          <div 
                            className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-500 group-hover:from-emerald-600 group-hover:to-teal-600 transition-all duration-300"
                            style={{ height: `${pct}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-xl z-20 w-32 text-center pointer-events-none">
                            <span className="font-bold border-b border-slate-700 pb-1 mb-1 block w-full">{pt.timestamp}</span>
                            <span className="flex justify-between w-full"><span>RAM:</span> <span>{pt.memoryUsed} GB</span></span>
                            <span className="flex justify-between w-full"><span>Limit:</span> <span>{pt.memoryTotal} GB</span></span>
                            <span className="flex justify-between w-full text-emerald-400"><span>Oran:</span> <span>%{pct.toFixed(0)}</span></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-1">
                  <span>{telemetryData[0]?.timestamp || "Başlangıç"}</span>
                  <span>Şimdi ({telemetryData[telemetryData.length - 1]?.timestamp || "Bitiş"})</span>
                </div>
              </div>
            </div>

            {/* Sube & Veritabani Dagilimlari */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Grafik 1: Sube Dağılım Grafiği */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Bayi Şube Dağılımı</h4>
                <div className="space-y-4 pt-2">
                  {tenantConfigs
                    .sort((a, b) => b.meta.branchLimit - a.meta.branchLimit)
                    .map((item, idx) => {
                      const maxVal = Math.max(...tenantConfigs.map(t => t.meta.branchLimit));
                      const pct = maxVal > 0 ? (item.meta.branchLimit / maxVal) * 100 : 0;
                      const colors = [
                        "from-indigo-500 to-indigo-600",
                        "from-blue-500 to-blue-600",
                        "from-violet-500 to-violet-600",
                        "from-purple-500 to-purple-600",
                        "from-fuchsia-500 to-fuchsia-600",
                        "from-pink-500 to-pink-600",
                        "from-rose-500 to-rose-600"
                      ];
                      const colorClass = colors[idx % colors.length];

                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{item.tenant.fullName}</span>
                            <span className="font-mono text-indigo-600 font-bold">{item.meta.branchLimit} Sube</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                            <div
                              className={`bg-gradient-to-r ${colorClass} h-3 rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Grafik 2: Veritabani Dağılımı */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Veritabani Boyut Dağılımı (GB)</h4>
                  <div className="space-y-4 pt-4">
                    {tenantConfigs
                      .sort((a, b) => b.meta.databaseSizeGb - a.meta.databaseSizeGb)
                      .map((item, idx) => {
                        const maxVal = Math.max(...tenantConfigs.map(t => t.meta.databaseSizeGb));
                        const pct = maxVal > 0 ? (item.meta.databaseSizeGb / maxVal) * 100 : 0;
                        const colors = [
                          "from-emerald-500 to-emerald-600",
                          "from-blue-500 to-blue-600",
                          "from-sky-500 to-sky-600",
                          "from-indigo-500 to-indigo-600",
                          "from-violet-500 to-violet-600"
                        ];
                        const colorClass = colors[idx % colors.length];

                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{item.tenant.fullName}</span>
                              <span className="font-mono text-emerald-600 font-bold">{item.meta.databaseSizeGb.toFixed(1)} GB</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                              <div
                                className={`bg-gradient-to-r ${colorClass} h-3 rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BILLING TAB */}
      {/* MUHASEBE & FINANS TAB */}
      {mainTab === "billing" && (
        <div className="space-y-6">
          {/* Finansal KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MRR */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Yinelenen Aylik Gelir (MRR)</span>
              <span className="text-3xl font-extrabold text-indigo-600 mt-2 block font-mono">
                {kpis.totalMRR.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
              </span>
              <span className="text-[10px] text-slate-500 mt-2 block font-semibold">≈ Yıllık Değer (ARR): {(kpis.totalMRR * 12).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</span>
            </div>

            {/* Toplam Tahsilat */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Toplam SaaS Tahsilati</span>
              <span className="text-3xl font-extrabold text-emerald-600 mt-2 block font-mono">
                {(() => {
                  const allLedger = tenantConfigs.flatMap(c => c.meta.billingLedger);
                  const totalCollections = allLedger.filter(e => e.type === "COLLECTION").reduce((sum, e) => sum + e.amount, 0);
                  return totalCollections.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
                })()}
              </span>
              <span className="text-[10px] text-emerald-600 mt-2 block font-bold">S Toplam Nakit Girişi</span>
            </div>

            {/* Operasyonel Giderler */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Operasyonel Giderler</span>
              <span className="text-3xl font-extrabold text-rose-650 mt-2 block font-mono">
                {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
              </span>
              <span className="text-[10px] text-rose-600 mt-2 block font-bold">R Toplam Nakit Çıkışı</span>
            </div>

            {/* Net Kar & Marj */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Kar & Kar Marji</span>
              {(() => {
                const allLedger = tenantConfigs.flatMap(c => c.meta.billingLedger);
                const totalCollections = allLedger.filter(e => e.type === "COLLECTION").reduce((sum, e) => sum + e.amount, 0);
                const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
                const netProfit = totalCollections - totalExpenses;
                const marginPct = totalCollections > 0 ? (netProfit / totalCollections) * 100 : 0;
                const isPositive = netProfit >= 0;
                return (
                  <>
                    <span className={`text-3xl font-extrabold mt-2 block font-mono ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                      {netProfit.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                    </span>
                    <span className={`text-[10px] mt-2 block font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                      {isPositive ? "" : ""} Kar Marji: %{marginPct.toFixed(1)}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Vadesi Gecen</div>
              <div className="text-xl font-extrabold text-rose-700 mt-1">
                {Number(reports?.kpis?.overdueAmount || 0).toLocaleString("tr-TR")} TL
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{reports?.dueBuckets?.overdue?.length || 0} kayit</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">7 Gun Icinde Vade</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">
                {Number((reports?.dueBuckets?.dueIn7 || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0)).toLocaleString("tr-TR")} TL
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{reports?.dueBuckets?.dueIn7?.length || 0} kayit</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">30 Gun Icinde Vade</div>
              <div className="text-xl font-extrabold text-indigo-700 mt-1">
                {Number((reports?.dueBuckets?.dueIn30 || []).reduce((s: number, x: any) => s + Number(x.amount || 0), 0)).toLocaleString("tr-TR")} TL
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{reports?.dueBuckets?.dueIn30?.length || 0} kayit</div>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Tahsilat Orani</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">%{Number(reports?.kpis?.collectionRatePct || 0).toFixed(1)}</div>
              <div className="text-[10px] text-slate-500 mt-1">Genel gelir/tahsilat oranı</div>
            </div>
          </div>

          {(reports?.renewalSuggestions?.length || 0) > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Yenileme Onerileri (&lt;=30 gun)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reports?.renewalSuggestions?.slice(0, 6).map((x) => (
                  <div key={x.tenantId} className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                    <div className="text-sm font-bold text-slate-800">{x.tenantName}</div>
                    <div className="text-xs text-slate-600 mt-1">{x.remainingDays} gün kaldı • Öneri: {Number(x.suggestedAmount || 0).toLocaleString("tr-TR")} TL</div>
                    <button
                      type="button"
                      onClick={() => void handleCreateRenewalCharge(x.tenantId, x.suggestedAmount, x.description)}
                      disabled={!canManageFinance}
                      className="mt-2 px-2 py-1 text-[10px] font-bold rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 disabled:opacity-50"
                    >
                      Tek Tik Yenileme Borcu Olustur
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Riskli Bayiler</h4>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {(reports?.riskTenants || []).slice(0, 8).map((r) => (
                  <div key={r.tenantId} className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-xs">
                    <div className="font-bold text-rose-800">{r.tenantName}</div>
                    <div className="text-rose-700 mt-0.5">{r.reason} • Gecikme: {Number(r.overdueAmount || 0).toLocaleString("tr-TR")} TL</div>
                  </div>
                ))}
                {!reportsLoadıng && (reports?.riskTenants || []).length === 0 && (
                  <div className="text-xs text-slate-400 italic">Riskli bayi bulunmuyor.</div>
                )}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aylik Finans Ozeti (6 Ay)</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=csv&type=monthly", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">CSV Aylik</button>
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=csv&type=due", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">CSV Vade</button>
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=csv&type=renewal", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">CSV Yenileme</button>
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=pdf&type=monthly", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">PDF Aylik</button>
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=pdf&type=due", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">PDF Vade</button>
                  <button type="button" onClick={() => window.open("/api/studio/reports?format=pdf&type=renewal", "_blank")} className="px-2 py-1 text-[10px] border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 font-bold text-slate-700">PDF Yenileme</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-1 text-left">Ay</th>
                      <th className="py-1 text-right">Borc</th>
                      <th className="py-1 text-right">Tahsilat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reports?.monthly || []).map((m) => (
                      <tr key={m.month} className="border-b border-slate-100">
                        <td className="py-1 font-semibold text-slate-700">{m.month}</td>
                        <td className="py-1 text-right text-amber-700 font-mono">{Number(m.charges || 0).toLocaleString("tr-TR")} TL</td>
                        <td className="py-1 text-right text-emerald-700 font-mono">{Number(m.collections || 0).toLocaleString("tr-TR")} TL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan Bazli Gelir Mini Grafik (6 Ay Toplam)</div>
                {(() => {
                  const totals = (reports?.monthly || []).reduce(
                    (acc, m) => {
                      acc.Lite += Number(m.byPlan?.Lite || 0);
                      acc.Service += Number(m.byPlan?.Service || 0);
                      acc.Pro += Number(m.byPlan?.Pro || 0);
                      acc.Enterprise += Number(m.byPlan?.Enterprise || 0);
                      return acc;
                    },
                    { Lite: 0, Service: 0, Pro: 0, Enterprise: 0 },
                  );
                  const maxVal = Math.max(1, totals.Lite, totals.Service, totals.Pro, totals.Enterprise);
                  const bars = [
                    { key: "Lite", val: totals.Lite, color: "bg-slate-500" },
                    { key: "Service", val: totals.Service, color: "bg-blue-600" },
                    { key: "Pro", val: totals.Pro, color: "bg-indigo-600" },
                    { key: "Enterprise", val: totals.Enterprise, color: "bg-amber-600" },
                  ];
                  return bars.map((b) => (
                    <div key={b.key}>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                        <span>{b.key}</span>
                        <span className="font-mono">{Number(b.val || 0).toLocaleString("tr-TR")} TL</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 border border-slate-200">
                        <div className={`h-2 rounded-full ${b.color}`} style={{ width: `${Math.max(3, (b.val / maxVal) * 100)}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Iki Sutunlu Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol Taraf: Cari Fatura/Tahsilat ve Gider Kayitlari */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bekleyen Alacaklar & Vade Takibi */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span></span> Bekleyen Alacaklar & Vade Takibi (Acik Faturalar)
                    </h3>
                    <p className="text-[11px] text-slate-400">Bayilerden tahsil edilmemiş, bekleyen vadeli tum faturalar</p>
                  </div>
                  <div className="text-[11px] text-rose-650 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                    Toplam Alacak: {
                      tenantConfigs.reduce((sum, c) => {
                        const unpaidCharges = c.meta.billingLedger.filter(e => e.type === "CHARGE" && e.status !== "PAID");
                        return sum + unpaidCharges.reduce((s, e) => s + e.amount, 0);
                      }, 0).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })
                    }
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Bayi / Partner</th>
                        <th className="py-2.5">Kategori</th>
                        <th className="py-2.5">Aciklama</th>
                        <th className="py-2.5">Vade Tarihi</th>
                        <th className="py-2.5 text-center">Durum / Kalan Vade</th>
                        <th className="py-2.5 text-right">Tutar</th>
                        <th className="py-2.5 text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const unpaidEntries = tenantConfigs.flatMap((c) => 
                          c.meta.billingLedger
                            .filter((e) => e.type === "CHARGE" && e.status !== "PAID")
                            .map((e) => ({
                              ...e,
                              tenantId: c.id,
                              tenantName: c.tenant.fullName,
                              tenantPhone: c.tenant.phone,
                              tenantEmail: c.tenant.email
                            }))
                        ).sort((a, b) => new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime());

                        if (unpaidEntries.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                                Bekleyen/vadesi geçmiş acik fatura bulunmamaktadır.
                              </td>
                            </tr>
                          );
                        }

                        return unpaidEntries.map((e) => {
                          const todayStr = "2026-05-23";
                          const today = new Date(todayStr);
                          const due = new Date(e.dueDate || e.date);
                          const diffTime = due.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          let badge = null;
                          if (diffDays > 0) {
                            badge = (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold text-[9px]">
                                {diffDays} Gun Vade Var
                              </span>
                            );
                          } else if (diffDays === 0) {
                            badge = (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-250 font-bold text-[9px]">
                                Bugun Son Gun
                              </span>
                            );
                          } else {
                            badge = (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-250 font-bold text-[9px]">
                                {Math.abs(diffDays)} Gun Gecikti
                              </span>
                            );
                          }

                          return (
                            <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="py-3 font-bold text-slate-700">{e.tenantName}</td>
                              <td className="py-3">
                                {e.category === "LICENSE" && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-bold border border-indigo-150">LISANS</span>}
                                {e.category === "SUPPORT" && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-bold border border-emerald-150">DESTEK</span>}
                                {e.category === "CUSTOM_DEV" && <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[8px] font-bold border border-violet-150">GELISTIRME</span>}
                                {e.category === "SMS_PACK" && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-bold border border-blue-150">SMS/API</span>}
                              </td>
                              <td className="py-3 text-slate-600 font-medium">{e.description}</td>
                              <td className="py-3 font-mono text-slate-500">{e.dueDate || e.date}</td>
                              <td className="py-3 text-center">{badge}</td>
                              <td className="py-3 font-mono font-bold text-right text-stone-900">{e.amount.toLocaleString()} TL</td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleCollectInvoice(e.tenantId, e.id)}
                                    disabled={!canManageFinance}
                                    className="px-2 py-1 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-[10px] cursor-pointer transition-all active:scale-[0.98]"
                                    title="Tahsil Et ve Kapat"
                                  >
                                    S Tahsil Et
                                  </button>
                                  <button
                                    onClick={() => handleDownloadInvoicePDF(e, { fullName: e.tenantName, phone: e.tenantPhone, email: e.tenantEmail })}
                                    className="px-2 py-1 text-stone-700 hover:bg-stone-50 border border-stone-200 rounded-lg font-bold text-[10px] cursor-pointer transition-all active:scale-[0.98]"
                                    title="Fatura PDF"
                                  >
                                    x Fatura
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gelir Kayitlari */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>x</span> SaaS Gelir Hareketleri (Faturalar & Tahsilatlar)
                    </h3>
                    <p className="text-[11px] text-slate-400">Bayilerden toplanan lisans ve hizmet odemeleri</p>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                    Bekleyen Alacaklar: {kpis.totalReceivable.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sol Fatura Listesi */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-3">Son Kesilen Faturalar (SaaS)</h4>
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {tenantConfigs
                        .flatMap((c) => c.meta.billingLedger.map((e) => ({ ...e, tenantName: c.tenant.fullName, tenantPhone: c.tenant.phone, tenantEmail: c.tenant.email })))
                        .filter((e) => e.type === "CHARGE")
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((e) => (
                          <div key={e.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-200/60">
                            <div>
                              <div className="font-bold text-slate-700 truncate max-w-[150px]">{e.tenantName}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap font-mono">
                                <span>{e.description}  {e.date}</span>
                                {e.category === "LICENSE" && <span className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[7px] font-bold border border-indigo-150">LISANS</span>}
                                {e.category === "SUPPORT" && <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[7px] font-bold border border-emerald-150">DESTEK</span>}
                                {e.category === "CUSTOM_DEV" && <span className="px-1 py-0.2 rounded bg-violet-50 text-violet-700 text-[7px] font-bold border border-violet-150">GELISTIRME</span>}
                                {e.category === "SMS_PACK" && <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-700 text-[7px] font-bold border border-blue-150">API</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-600">+{e.amount.toLocaleString()} TL</span>
                              <button
                                onClick={() => handleDownloadInvoicePDF(e, { fullName: e.tenantName, phone: e.tenantPhone, email: e.tenantEmail })}
                                className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                                title="Faturayi Indir"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Son Tahsilat Listesi */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-3">Son Tahsilatlar (SaaS)</h4>
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {tenantConfigs
                        .flatMap((c) => c.meta.billingLedger.map((e) => ({ ...e, tenantName: c.tenant.fullName, tenantPhone: c.tenant.phone, tenantEmail: c.tenant.email })))
                        .filter((e) => e.type === "COLLECTION")
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10)
                        .map((e) => (
                          <div key={e.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-200/60">
                            <div>
                              <div className="font-bold text-slate-700 truncate max-w-[150px]">{e.tenantName}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap font-mono">
                                <span>{e.description}  {e.date}</span>
                                {e.category === "LICENSE" && <span className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[7px] font-bold border border-indigo-150">LISANS</span>}
                                {e.category === "SUPPORT" && <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[7px] font-bold border border-emerald-150">DESTEK</span>}
                                {e.category === "CUSTOM_DEV" && <span className="px-1 py-0.2 rounded bg-violet-50 text-violet-700 text-[7px] font-bold border border-violet-150">GELISTIRME</span>}
                                {e.category === "SMS_PACK" && <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-700 text-[7px] font-bold border border-blue-150">API</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-600">-{e.amount.toLocaleString()} TL</span>
                              <button
                                onClick={() => handleDownloadInvoicePDF(e, { fullName: e.tenantName, phone: e.tenantPhone, email: e.tenantEmail })}
                                className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                                title="Makbuzu Indir"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operasyonel Gider Listesi */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>x0</span> Operasyonel Gider Takip Defteri
                    </h3>
                    <p className="text-[11px] text-slate-400">Sunucu altyapisi, personel maaşları, pazarlama ve genel yonetim giderleri</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Tarih</th>
                        <th className="py-2.5">Kategori</th>
                        <th className="py-2.5">Aciklama</th>
                        <th className="py-2.5 text-right">Tutar</th>
                        <th className="py-2.5 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">Kayitli gider bulunmamaktadır.</td>
                        </tr>
                      ) : (
                        expenses
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((exp) => {
                            let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
                            if (exp.category === "Altyapi/Sunucu") badgeStyle = "bg-sky-50 text-sky-700 border-sky-200";
                            else if (exp.category === "Personel Maaşları") badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                            else if (exp.category === "Pazarlama/Reklam") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                            else if (exp.category === "Ofis/Diğer") badgeStyle = "bg-slate-50 text-slate-700 border-slate-200";

                            return (
                              <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="py-3 font-mono font-semibold text-slate-600">{exp.date}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badgeStyle}`}>
                                    {exp.category}
                                  </span>
                                </td>
                                <td className="py-3 font-medium text-slate-700">{exp.description}</td>
                                <td className="py-3 font-mono font-bold text-right text-rose-600">{exp.amount.toLocaleString()} TL</td>
                                <td className="py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Gideri Sil"
                                  >
                                    x
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sol Taraf: Cari İşlem, Gider Ekleme ve Kategori Bazli Dağılım */}
            <div className="space-y-6">
              {/* Bayi Cari İşlemi Ekle */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>x`</span> Yeni Bayi Cari İşlemi Ekle
                </h3>
                <form onSubmit={handleAddGlobalLedgerEntry} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bayi / Partner</label>
                    <select
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                      value={globalLedgerTenantId}
                      onChange={(e) => setGlobalLedgerTenantId(e.target.value)}
                    >
                      <option value="">-- Bayi Secin --</option>
                      {tenantConfigs.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                          {tc.tenant.fullName} ({tc.meta.plan})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">İşlem Turu</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                        value={globalLedgerType}
                        onChange={(e) => setGlobalLedgerType(e.target.value as any)}
                      >
                        <option value="CHARGE">BOR!LANDIR (Fatura)</option>
                        <option value="COLLECTION">TAHSILAT YAP</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kategori</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                        value={globalLedgerCategory}
                        onChange={(e) => setGlobalLedgerCategory(e.target.value as any)}
                      >
                        <option value="LICENSE">LISANS</option>
                        <option value="SUPPORT">DESTEK</option>
                        <option value="CUSTOM_DEV">GELISTIRME</option>
                        <option value="SMS_PACK">SMS/API PAKETI</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aciklama</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                      placeholder="Örn: 2026 Yıllık Lisans Bedeli"
                      value={globalLedgerDesc}
                      onChange={(e) => setGlobalLedgerDesc(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tutar (TL)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                        placeholder="0.00"
                        value={globalLedgerAmount}
                        onChange={(e) => setGlobalLedgerAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">İşlem Tarihi</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                        value={globalLedgerDate}
                        onChange={(e) => setGlobalLedgerDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {globalLedgerType === "CHARGE" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vade Tarihi (Son deme)</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:bg-white"
                        value={globalLedgerDueDate}
                        onChange={(e) => setGlobalLedgerDueDate(e.target.value)}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAddingGlobalLedger || !canManageFinance}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>+</span> {isAddingGlobalLedger ? "Kaydediliyor..." : "Cari Islemi Kaydet"}
                  </button>
                </form>
              </div>

              {/* Gider Ekle */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>+</span> Yeni Operasyonel Gider Ekle
                </h3>
                <form onSubmit={handleAddExpense} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kategori</label>
                    <select
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <option value="Altyapi/Sunucu"> Altyapi/Sunucu</option>
                      <option value="Personel Maaşları">x Personel Maaşları</option>
                      <option value="Pazarlama/Reklam">x Pazarlama/Reklam</option>
                      <option value="Ofis/Diğer">x Ofis/Diğer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gider Aciklamasi</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="Örn: Vercel Pro Hosting Screti"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tutar (TL)</label>
                    <input
                      type="number"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gider Tarihi</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>x</span> Gider Kaydi Oluştur
                  </button>
                </form>
              </div>

              {/* Kategori Dağılımı */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>x`</span> Gider Kategori Dağılımı
                </h3>
                <div className="space-y-3.5">
                  {(() => {
                    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
                    const cats = ["Altyapi/Sunucu", "Personel Maaşları", "Pazarlama/Reklam", "Ofis/Diğer"];
                    return cats.map((c) => {
                      const amount = expenses.filter((e) => e.category === c).reduce((sum, e) => sum + e.amount, 0);
                      const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                      let color = "bg-slate-400";
                      if (c === "Altyapi/Sunucu") color = "bg-sky-500";
                      else if (c === "Personel Maaşları") color = "bg-indigo-600";
                      else if (c === "Pazarlama/Reklam") color = "bg-amber-500";
                      else if (c === "Ofis/Diğer") color = "bg-slate-500";

                      return (
                        <div key={c}>
                          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>{c}</span>
                            <span className="font-mono text-slate-700">{amount.toLocaleString()} TL ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAKET & FIYAT YNETIMI TAB */}
      {mainTab === "pricing" && (
        <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>x</span> SaaS Paket & Lisans Fiyatlandirma Paneli
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                VibeGSM SaaS modelinde bayilerinize sunacağınız paketlerin aylık taban ücretlerini, şube sınır politikalarını, ek paket eklentilerini ve tier özellik matrislerini yönetin.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-6">
              {/* Taban Paket Fiyatlari */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span>x</span> 1. Taban Plan Fiyatlari (Aylik)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lite Paket Taban Fiyati</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editLitePrice}
                        onChange={(e) => setEditLitePrice(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL/ay
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Mevcut: {pricing.Lite} </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pro Paket Taban Fiyati</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editProPrice}
                        onChange={(e) => setEditProPrice(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL/ay
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Mevcut: {pricing.Pro} </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Servis Paket Taban Fiyati</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editServicePrice}
                        onChange={(e) => setEditServicePrice(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL/ay
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Mevcut: {pricing.Service} </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Enterprise Paket Taban Fiyati</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editEnterprisePrice}
                        onChange={(e) => setEditEnterprisePrice(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL/ay
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Mevcut: {pricing.Enterprise} </span>
                  </div>
                </div>
              </div>

              {/* Çoklu Şube Sınırı */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span>x</span> 2. Şube Sınırı & Ek Ücret Politikası
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Taban Ücretsiz Şube Sınırı</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editFreeBranchLimit}
                        onChange={(e) => setEditFreeBranchLimit(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        Sube
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Taban fiyata dahil şube sayısı (Mevcut: {pricing.freeBranchLimit})</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Şube Başına Ek Aylık Ücret</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editBranchSurcharge}
                        onChange={(e) => setEditBranchSurcharge(Number(e.target.value))}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL/ay
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Taban şube sınırı aşıldığında şube başı uygulanacak sürşarj (Mevcut: {pricing.branchSurchargePrice} )</span>
                  </div>
                </div>
              </div>

              {/* Ek Hizmet & Eklentiler */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span>+</span> 3. Ek Hizmetler & Eklentiler (Add-Ons)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">10,000 API Istek Paketi</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editAddons.apiPackPrice}
                        onChange={(e) => setEditAddons({ ...editAddons, apiPackPrice: Number(e.target.value) })}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ek 1 GB Veritabani Alani</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editAddons.dbGbPrice}
                        onChange={(e) => setEditAddons({ ...editAddons, dbGbPrice: Number(e.target.value) })}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">zel Gelir Geliştirme (Saat)</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editAddons.customDevHourly}
                        onChange={(e) => setEditAddons({ ...editAddons, customDevHourly: Number(e.target.value) })}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        TL
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Yıllık deme Indirim Orani</label>
                    <div className="relative mt-1.5 rounded-xl shadow-sm">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={editAddons.annualDiscountPct}
                        onChange={(e) => setEditAddons({ ...editAddons, annualDiscountPct: Number(e.target.value) })}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-bold text-slate-400">
                        %
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* zellik Matrisi Yönetimi */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span>x9</span> 4. Paket Bazli zellik & Limit Matrisi
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-2.5">ERP Modulu / Hizmet Seviyesi</th>
                        <th className="py-2.5 text-center">Lite Plani</th>
                        <th className="py-2.5 text-center">Pro Planı</th>
                        <th className="py-2.5 text-center">Enterprise Planı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* POS */}
                      <tr className="border-b border-slate-200/50 font-medium">
                        <td className="py-3 text-slate-700 font-semibold">POS Kasa Satış & Ciro Modulu</td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Lite.pos}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, pos: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Pro.pos}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, pos: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Enterprise.pos}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, pos: e.target.checked }
                            })}
                          />
                        </td>
                      </tr>

                      {/* Repairs */}
                      <tr className="border-b border-slate-200/50 font-medium">
                        <td className="py-3 text-slate-700 font-semibold">Teknik Servis Modulu (Repairs)</td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Lite.repairs}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, repairs: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Pro.repairs}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, repairs: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Enterprise.repairs}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, repairs: e.target.checked }
                            })}
                          />
                        </td>
                      </tr>

                      {/* Stock */}
                      <tr className="border-b border-slate-200/50 font-medium">
                        <td className="py-3 text-slate-700 font-semibold">Stok & Depo Envanter Yönetimi</td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Lite.stock}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, stock: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Pro.stock}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, stock: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Enterprise.stock}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, stock: e.target.checked }
                            })}
                          />
                        </td>
                      </tr>

                      {/* Invoicing */}
                      <tr className="border-b border-slate-200/50 font-medium">
                        <td className="py-3 text-slate-700 font-semibold">Resmi E-Fatura / E-Arşiv Modulu</td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Lite.invoicing}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, invoicing: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Pro.invoicing}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, invoicing: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Enterprise.invoicing}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, invoicing: e.target.checked }
                            })}
                          />
                        </td>
                      </tr>

                      {/* Buyback */}
                      <tr className="border-b border-slate-200/50 font-medium">
                        <td className="py-3 text-slate-700 font-semibold">Cihaz Alim Geri Kazanim (Buyback)</td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Lite.buyback}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, buyback: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Pro.buyback}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, buyback: e.target.checked }
                            })}
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded text-indigo-650 focus:ring-indigo-500"
                            checked={editFeatures.Enterprise.buyback}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, buyback: e.target.checked }
                            })}
                          />
                        </td>
                      </tr>

                      {/* Support SLA */}
                      <tr className="font-semibold text-slate-700">
                        <td className="py-3 text-slate-800">Müşteri Destek & SLA Seviyesi</td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={editFeatures.Lite.supportLevel}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Lite: { ...editFeatures.Lite, supportLevel: e.target.value }
                            })}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={editFeatures.Pro.supportLevel}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Pro: { ...editFeatures.Pro, supportLevel: e.target.value }
                            })}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="text"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={editFeatures.Enterprise.supportLevel}
                            onChange={(e) => setEditFeatures({
                              ...editFeatures,
                              Enterprise: { ...editFeatures.Enterprise, supportLevel: e.target.value }
                            })}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kaydetme Butonu */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Degisiklik Nedeni (Audit)</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  value={pricingChangeReason}
                  onChange={(e) => setPricingChangeReason(e.target.value)}
                  placeholder="OÖrn: Yıllık kampanya nedeniyle Pro fiyat güncellemesi"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPricing || !canManagePricing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPricing ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <span>x</span> Tüm Fiyatlandirma & zellikleri Uygula
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Fiyatlandirma Gecmisi</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(reports?.pricingHistory || []).slice(0, 8).map((h: any) => (
                    <div key={h.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-700">{h.reason || "Degisiklik"}</div>
                      <div className="text-slate-500 mt-0.5">{new Date(h.createdAt).toLocaleString("tr-TR")} • {h.createdBy}</div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => void handleRevertPricing(h.id)}
                          disabled={!canManagePricing}
                          className="px-2 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700"
                        >
                          Bu Kayda Geri Al
                        </button>
                      </div>
                    </div>
                  ))}
                  {!reportsLoadıng && (reports?.pricingHistory || []).length === 0 && (
                    <div className="text-xs text-slate-400 italic">Henüz gecmis kaydi yok.</div>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Audit Timeline</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(reports?.auditLogs || []).slice(0, 8).map((l: any) => (
                    <div key={l.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-700">{l.action}</div>
                      <div className="text-slate-500 mt-0.5">{new Date(l.createdAt).toLocaleString("tr-TR")} • {l.actor}</div>
                    </div>
                  ))}
                  {!reportsLoadıng && (reports?.auditLogs || []).length === 0 && (
                    <div className="text-xs text-slate-400 italic">Audit kaydi bulunmuyor.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM LOGS TAB */}
      {mainTab === "logs" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>i</span> Sistem Sagligi & Olay Loglari
                </h3>
                <p className="text-xs text-slate-500">
                  SaaS altyapisinda gerçekleşen son sistem olaylari, API istekleri ve senkronizasyon kayitlari.
                </p>
              </div>
              {/* Log Filtreleri */}
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                {/* Log Arama */}
                <input
                  type="text"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  placeholder="Loglarda ara..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
                {/* Seviye Filtresi */}
                <select
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value as any)}
                >
                  <option value="ALL">Tüm Seviyeler</option>
                  <option value="INFO">xx INFO</option>
                  <option value="WARNING">xx WARNING</option>
                  <option value="ERROR">x ERROR</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-950 font-mono text-xs text-slate-300 space-y-2.5 h-[500px] overflow-y-auto shadow-inner">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-12">Filtrelere uygun log kaydi bulunamadı.</div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const levelColors = {
                    INFO: "text-emerald-400",
                    WARNING: "text-amber-400",
                    ERROR: "text-rose-400"
                  };
                  return (
                    <div key={idx}>
                      <span className="text-slate-500">[{log.time}]</span>{" "}
                      <span className={`${levelColors[log.level as keyof typeof levelColors] || "text-slate-300"} font-bold`}>
                        {log.level}:
                      </span>{" "}
                      <span className="text-indigo-300">[{log.module}]</span> {log.text}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED SAAS TENANT CONSOLE MODAL - White light mode */}
      {selectedTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-6xl h-[90vh] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">SaaS CRM/ERP Yönetim Konsolu (SuperAdmin Console)</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">
                  {detailLoadıng ? "Veri Yükleniyor..." : `Firma Yönetimi: ${detailData?.customer.fullName}`}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTenantId(null)}
                className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6">
              {[
                { id: "GENERAL" as const, label: "Genel & Lisans", icon: "G" },
                { id: "CRM" as const, label: "Aktivite & CRM", icon: "C" },
                { id: "TICKETS" as const, label: "Destek & Talepler", icon: "T" },
                { id: "ERP" as const, label: "Finans & ERP", icon: "E" },
                { id: "ROLES" as const, label: "Rol & Yetki Yönetimi", icon: "R" },
                { id: "USERS" as const, label: "Kullanıcılar", icon: "U" },
                { id: "AUDIT" as const, label: "Denetim Kaydı", icon: "A" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveConsoleTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                    activeConsoleTab === tab.id
                      ? "border-indigo-650 text-indigo-650 bg-white border-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {detailLoadıng ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                <span className="text-slate-500 text-sm">Firma lisans detaylari derleniyor...</span>
              </div>
            ) : !detailData ? (
              <div className="flex-1 flex items-center justify-center text-rose-600 font-bold">Veri yuklenemedi.</div>
            ) : (
              <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/30">
                {/* GENERAL TAB */}
                {activeConsoleTab === "GENERAL" && (
                  (() => {
                    // Compute churn risk on the fly
                    const meta = detailData?.saasMetadata;
                    let modalIsChurnRisk = false;
                    let modalChurnReason = "";
                    if (meta) {
                      const daysRemaining = Math.max(0, Math.ceil((new Date(meta.licenseEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      const isNearExpiry = daysRemaining <= 30;
                      
                      const apiQuotaVal = meta.smsQuota ?? 5000;
                      const apiUsedVal = meta.smsUsed ?? 0;
                      const apiUsagePct = apiQuotaVal > 0 ? (apiUsedVal / apiQuotaVal) * 100 : 0;
                      const isLowApiUsage = apiUsagePct < 5;

                      const hasRecentNote = meta.leadHistory && meta.leadHistory.some((h: any) => {
                        const noteTime = new Date(h.date).getTime();
                        return (Date.now() - noteTime) <= 15 * 24 * 60 * 60 * 1000;
                      });
                      const noRecentNote = !hasRecentNote;

                      modalIsChurnRisk = isNearExpiry && (isLowApiUsage || noRecentNote);
                      if (modalIsChurnRisk) {
                        const reasons = [];
                        if (isLowApiUsage) reasons.push(`API kullanimi %${apiUsagePct.toFixed(1)} < %5`);
                        if (noRecentNote) reasons.push("son 15 gunde görüşme notu girilmemiş");
                        modalChurnReason = `Lisans bitişine ${daysRemaining} gun kaldi ve ` + reasons.join(" ve ");
                      }
                    }

                    return (
                      <div className="p-6 space-y-6">
                        {modalIsChurnRisk && (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-start gap-2.5">
                            <span className="text-lg">a</span>
                            <div>
                              <div className="font-extrabold">Yuksek Churn Riski Algilandi!</div>
                              <div className="font-normal text-rose-700 mt-1">{modalChurnReason}</div>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left Column: Basic Info */}
                          <div className="lg:col-span-2 space-y-6">
                            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Firma Kimlik Bilgileri</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Firma Adi</label>
                            <input
                              type="text"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Telefon</label>
                            <input
                              type="text"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">E-Posta</label>
                            <input
                              type="email"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Lisans & Paket Kontrolu</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Lisans Planı</label>
                            <select
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-semibold"
                              value={editPlan}
                              onChange={(e) => setEditPlan(e.target.value as any)}
                            >
                              <option value="Lite">Lite ({pricing.Lite} TL/ay)</option>
                              <option value="Service">Servis ({pricing.Service} TL/ay)</option>
                              <option value="Pro">Pro ({pricing.Pro} TL/ay)</option>
                              <option value="Enterprise">Enterprise ({pricing.Enterprise} TL/ay)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Izin Verilen Şube Limiti</label>
                            <input
                              type="number"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editBranchLimit}
                              onChange={(e) => setEditBranchLimit(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Lisans Başlangıç</label>
                            <input
                              type="date"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:bg-white"
                              value={editLicenseStart}
                              onChange={(e) => setEditLicenseStart(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Lisans Bitiş / Yenileme</label>
                            <input
                              type="date"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:bg-white"
                              value={editLicenseEnd}
                              onChange={(e) => setEditLicenseEnd(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Finans Ozeti (Tek Bakis)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-slate-500">Net Bakiye</div>
                            <div className="font-bold text-slate-800 mt-1">{Number(detailData.financialSummary?.netBalance || 0).toLocaleString("tr-TR")} TL</div>
                          </div>
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                            <div className="text-rose-600">Vadesi Gecen</div>
                            <div className="font-bold text-rose-700 mt-1">{Number(detailData.financialSummary?.overdueAmount || 0).toLocaleString("tr-TR")} TL</div>
                          </div>
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="text-amber-600">7 Gun Icinde</div>
                            <div className="font-bold text-amber-700 mt-1">{Number(detailData.financialSummary?.dueIn7Amount || 0).toLocaleString("tr-TR")} TL</div>
                          </div>
                          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                            <div className="text-indigo-600">30 Gun Icinde</div>
                            <div className="font-bold text-indigo-700 mt-1">{Number(detailData.financialSummary?.dueIn30Amount || 0).toLocaleString("tr-TR")} TL</div>
                          </div>
                        </div>
                      </div>

                      {/* Subeler ve Terminal Detaylari */}
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Şubeler & Terminal Detayları ({editBranchLimit} Şube Yetkili)</h4>
                          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">500+ Şube Entegrasyonu</span>
                        </div>
                        
                        <div className="text-xs text-slate-500 font-medium">
                          Bayinin sunucularımıza bağlı şubeleri ve aktif terminalleri.
                        </div>

                        {/* Search and list branches */}
                        <div className="space-y-3">
                          <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
                            {(() => {
                              const branchCount = Math.min(editBranchLimit, 250);
                              const cities = ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Kocaeli", "Mersin", "Gaziantep", "Konya", "Samsun", "Eskişehir"];
                              const districts = ["Merkez", "Çarşı", "Kizilay", "Alsancak", "Kadıkoy", "Nilufer", "Lara", "Yenişehir", "Ilkadım", "Odunpazari", "Bornova", "Beşiktaş"];
                              
                              const generatedBranches = Array.from({ length: branchCount }).map((_, idx) => {
                                const city = cities[idx % cities.length];
                                const district = districts[(idx + 2) % districts.length];
                                const isOnline = idx % 15 !== 0; // 93% online
                                const terminals = (idx % 3) + 1; // 1-3 POS terminals
                                const dbSize = parseFloat((0.05 + (idx % 7) * 0.08).toFixed(2));
                                const lastSync = new Date(Date.now() - (idx % 12) * 5 * 60 * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
                                return {
                                  name: `${city} ${district} Şubesi #${idx + 1}`,
                                  status: isOnline ? "ONLINE" : "OFFLINE",
                                  terminals,
                                  dbSize,
                                  lastSync
                                };
                              });

                              return generatedBranches.slice(0, 10).map((br, index) => (
                                <div key={index} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-all text-xs">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                      <span>{br.name}</span>
                                      {br.status === "ONLINE" ? (
                                        <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[8px] font-extrabold border border-emerald-200">ONLINE</span>
                                      ) : (
                                        <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-700 text-[8px] font-extrabold border border-rose-200">OFFLINE</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">Veritabani: {br.dbSize} GB  Son Eşitleme: Bugun {br.lastSync}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px]">{br.terminals} POS</span>
                                    <button
                                      type="button"
                                      onClick={() => toast.success(`${br.name} başarıyla senkronize edildi.`)}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-655 hover:text-slate-800 rounded border border-slate-200 font-bold text-[9px] shadow-sm transition-all"
                                    >
                                      Senkronize Et
                                    </button>
                                  </div>
                                </div>
                              ));
                            })()}
                            {editBranchLimit > 10 && (
                              <div className="p-2.5 text-center text-[10px] text-slate-400 bg-slate-50 font-bold italic">
                                ... ve {editBranchLimit - 10} diğer şube daha listeleniyor
                              </div>
                            )}
                          </div>
                          
                          {/* Sync actions for all */}
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => toast.success(`Tüm ${editBranchLimit} şubeye sürüm güncellemeleri başarıyla gönderildi.`)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 font-bold text-[10px] transition-all"
                            >
                              xa Tüm Şubelere POS Sürüm Güncellemesi Gönder
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Module Authorization & Database Size */}
                    <div className="space-y-6">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Modul Yetkileri</h4>
                        <div className="flex flex-col gap-2">
                          {Object.keys(editModules).filter((modKey) => modKey !== "buyback").map((modKey) => {
                            const labelMap: Record<string, string> = {
                              pos: "POS Satış Modulu",
                              repairs: "Teknik Servis",
                              stock: "Stok Yönetimi",
                              buyback: "Ikinci El Alim-Satim",
                              invoicing: "E-Arşiv Fatura",
                            };
                            const key = modKey as keyof typeof editModules;
                            return (
                              <button
                                key={key}
                                onClick={() => setEditModules({ ...editModules, [key]: !editModules[key] })}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                                  editModules[key]
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <span>{labelMap[key]}</span>
                                <span className="font-mono text-xs">{editModules[key] ? "AKTIF S" : "PASIF R"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Disk Limitleri</h4>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Veritabani Limiti (GB)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                            value={editDatabaseSizeGb}
                            onChange={(e) => setEditDatabaseSizeGb(Number(e.target.value))}
                          />
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                            <span>Kullanim Orani</span>
                            <span className="font-mono font-bold text-slate-700">{editDatabaseSizeGb} GB / 5.0 GB</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200">
                            <div
                              className="bg-indigo-650 h-2.5 rounded-full bg-indigo-600"
                              style={{ width: `${Math.min(100, (editDatabaseSizeGb / 5) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

                {/* CRM TAB */}
                {activeConsoleTab === "CRM" && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status selection and Pipeline Position */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">CRM Satış Durumu</h4>
                        <div className="space-y-2">
                          {[
                            { id: "LEAD" as const, label: "Müşteri Adayi (Lead)", color: "border-blue-200 bg-blue-50 text-blue-800" },
                            { id: "NEGOTIATION" as const, label: "Görüşme Aşaması", color: "border-violet-200 bg-violet-50 text-violet-800" },
                            { id: "OFFER_SENT" as const, label: "Teklif Iletildi", color: "border-amber-200 bg-amber-50 text-amber-800" },
                            { id: "WON" as const, label: "Kazanildi (Aktif Müşteri)", color: "border-emerald-200 bg-emerald-50 text-emerald-800" },
                            { id: "LOST" as const, label: "Kaybedildi (Arşiv)", color: "border-rose-200 bg-rose-50 text-rose-800" },
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => setEditLeadStatus(st.id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between ${
                                editLeadStatus === st.id
                                  ? `${st.color} ring-2 ring-offset-1 ring-indigo-500`
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <span>{st.label}</span>
                              {editLeadStatus === st.id && <span>S</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Aksiyon Zorunluluklari</h4>
                        <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" value={editNextActionDate} onChange={(e) => setEditNextActionDate(e.target.value)} />
                        <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="ownerUserId" value={editOwnerUserId} onChange={(e) => setEditOwnerUserId(e.target.value)} />
                        <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="expectedDealAmount" value={editExpectedDealAmount} onChange={(e) => setEditExpectedDealAmount(Number(e.target.value || 0))} />
                        <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="lostReason (LOST)" value={editLostReason} onChange={(e) => setEditLostReason(e.target.value)} />
                        <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="wonSource (WON)" value={editWonSource} onChange={(e) => setEditWonSource(e.target.value)} />
                      </div>
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Oneri Motoru</h4>
                        {crmSuggestions.length === 0 ? (
                          <p className="text-xs text-slate-400">Aktif oneriniz yok.</p>
                        ) : (
                          crmSuggestions.map((s, idx) => (
                            <div key={idx} className="p-2 rounded border border-amber-200 bg-amber-50 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-amber-800">{s.title}</span>
                              <button
                                className="px-2 py-1 rounded bg-amber-600 text-white text-[10px] font-bold"
                                onClick={() => selectedTenantId && applyCrmSuggestion(selectedTenantId, s.type)}
                              >
                                Göreve Cevir
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Timeline and Notes */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Yeni Görüşme / Aktivite Notu</h4>
                        <div className="space-y-3">
                          <textarea
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-805 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white min-h-[80px]"
                            placeholder="Müşteri ile yapilan görüşme veya aktivite detaylarini buraya not edin..."
                            value={newLeadNote}
                            onChange={(e) => setNewLeadNote(e.target.value)}
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={addLeadHistoryEntry}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                            >
                              Aktiviteyi Ekle
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">CRM Görevler</h4>
                          <button
                            className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-bold"
                            onClick={() => selectedTenantId && createCrmTask(selectedTenantId, { type: "FOLLOW_UP", title: "Yeni takip gorevi", dueDate: new Date().toISOString().split("T")[0] })}
                          >
                            + Görev
                          </button>
                        </div>
                        {(editCrmTasks || []).length === 0 ? (
                          <p className="text-xs text-slate-400">Görev yok.</p>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {(editCrmTasks || []).map((task) => (
                              <div key={task.id} className="p-2 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-bold text-slate-700">{task.title}</div>
                                  <div className="text-[10px] text-slate-500">{task.type} • {task.dueDate} • {task.ownerUserId || "UNASSIGNED"}</div>
                                </div>
                                <select
                                  value={task.status}
                                  onChange={(e) => selectedTenantId && updateCrmTask(selectedTenantId, task.id, { status: e.target.value as any })}
                                  className="text-[10px] px-2 py-1 rounded border border-slate-300 bg-white"
                                >
                                  <option value="OPEN">OPEN</option>
                                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                                  <option value="DONE">DONE</option>
                                  <option value="SNOOZED">SNOOZED</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Aktivite & Görüşme Geçmişi</h4>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                          {editLeadHistory.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Kayitli görüşme geçmişi bulunmuyor.</p>
                          ) : (
                            editLeadHistory.map((h, idx) => (
                              <div key={idx} className="relative pl-6 border-l-2 border-slate-200 pb-2 last:pb-0">
                                {/* Bullet indicator */}
                                <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white"></span>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                  <span>{h.date}  Yazar: {h.author}</span>
                                </div>
                                <p className="text-xs text-slate-705 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                  {h.note}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TICKETS TAB */}
                {activeConsoleTab === "TICKETS" && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Tickets List & New Ticket */}
                    <div className="lg:col-span-1 space-y-6 flex flex-col">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Yeni Destek Talebi</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Talep Başlığı</label>
                            <input
                              type="text"
                              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
                              placeholder="Fatura sorunu, hata vb..."
                              value={newTicketTitle}
                              onChange={(e) => setNewTicketTitle(e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori</label>
                              <select
                                className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-705 focus:outline-none focus:bg-white font-bold"
                                value={newTicketCategory}
                                onChange={(e) => setNewTicketCategory(e.target.value as any)}
                              >
                                <option value="BUG">BUG (Hata)</option>
                                <option value="FEATURE">ISTEK (zellik)</option>
                                <option value="BILLING">FATURA</option>
                                <option value="OTHER">DIGER</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Durum</label>
                              <select
                                className="w-full mt-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-705 focus:outline-none focus:bg-white font-bold"
                                value={newTicketStatus}
                                onChange={(e) => setNewTicketStatus(e.target.value as any)}
                              >
                                <option value="OPEN">A!IK</option>
                                <option value="IN_PROGRESS">ISLEMDE</option>
                                <option value="RESOLVED">!ZSLDS</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={addSupportTicket}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                          >
                            Destek Talebi Oluştur
                          </button>
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 flex-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Bilet Geçmişi</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {editTickets.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Açılmış destek talebi bulunmuyor.</p>
                          ) : (
                            editTickets.map((t) => {
                              const isSelected = selectedTicketId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setSelectedTicketIdInsideModal(t.id)}
                                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col gap-1.5 ${
                                    isSelected
                                      ? "bg-indigo-50 border-indigo-350 border-indigo-300 ring-1 ring-indigo-300"
                                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-extrabold text-slate-800 truncate max-w-[130px]">{t.title}</span>
                                    <span className="text-[9px] text-slate-400 font-mono">{t.createdAt}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {t.category === "BUG" && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-150">BUG</span>
                                    )}
                                    {t.category === "FEATURE" && (
                                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-150">ISTEK</span>
                                    )}
                                    {t.category === "BILLING" && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-150">FATURA</span>
                                    )}
                                    {t.category === "OTHER" && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-650 text-[9px] font-bold border border-slate-200">DIGER</span>
                                    )}

                                    {t.status === "OPEN" && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-extrabold border border-red-150">A!IK</span>
                                    )}
                                    {t.status === "IN_PROGRESS" && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-extrabold border border-amber-150 font-bold">ISLEMDE</span>
                                    )}
                                    {t.status === "RESOLVED" && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-extrabold border border-emerald-150 font-bold">!ZSLDS</span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-650 text-[9px] font-bold border border-slate-250">
                                      x {t.assignee || "Boşta"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Chat view */}
                    <div className="lg:col-span-2 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                      {selectedTicketId ? (
                        (() => {
                          const ticket = editTickets.find((t) => t.id === selectedTicketId);
                          if (!ticket) return <div className="p-6 text-center text-slate-400">Talep bulunamadı.</div>;
                          return (
                            <div className="flex flex-col h-full">
                              {/* Thread Header */}
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <div>
                                  <h4 className="text-xs font-extrabold text-slate-800 truncate max-w-[300px]">{ticket.title}</h4>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                    <span>Açılış: {ticket.createdAt}</span>
                                    <span></span>
                                    <span className="font-bold text-indigo-600">Yetkili: {ticket.assignee || "Boşta"}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addSupportChargeFromTicket(ticket)}
                                    className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                                  >
                                    Ucretli Destek Kalemi Ekle
                                  </button>
                                  <select
                                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-705 focus:outline-none"
                                    value={ticket.assignee || "Boşta"}
                                    onChange={(e) => handleAssigneeChange(ticket.id, e.target.value)}
                                  >
                                    <option value="Boşta">Atanmamış (Boşta)</option>
                                    <option value="Ahmet Sevim (SuperAdmin)">Ahmet Sevim (SuperAdmin)</option>
                                    <option value="Zeynep Yilmaz (Destek)">Zeynep Yilmaz (Destek)</option>
                                  </select>
                                  
                                  <select
                                    className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-705 focus:outline-none"
                                    value={ticket.status}
                                    onChange={(e) => {
                                      const updated = editTickets.map((t) =>
                                        t.id === selectedTicketId ? { ...t, status: e.target.value as any } : t
                                      );
                                      setEditTickets(updated);
                                      toast.success("Bilet durumu güncellendi.");
                                    }}
                                  >
                                    <option value="OPEN">A!IK</option>
                                    <option value="IN_PROGRESS">ISLEMDE</option>
                                    <option value="RESOLVED">!ZSLDS</option>
                                  </select>
                                </div>
                              </div>

                              {/* Messages list */}
                              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 max-h-[250px]">
                                {(ticket.messages || []).length === 0 ? (
                                  <div className="text-center text-slate-400 italic text-xs py-8">Henüz mesaj bulunmuyor. Mesaj yazıp cevap gönderin.</div>
                                ) : (
                                  (ticket.messages || []).map((msg, idx) => {
                                    const isAdmin = msg.sender === "Admin";
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex flex-col max-w-[80%] ${
                                          isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                                        }`}
                                      >
                                        <span className="text-[9px] font-bold text-slate-400 mb-0.5">
                                          {isAdmin ? "Destek Ekibi (Siz)" : "Firma Yöneticisi"}  {msg.date}
                                        </span>
                                        <div
                                          className={`p-2.5 rounded-2xl text-xs font-medium border shadow-sm ${
                                            isAdmin
                                              ? "bg-indigo-650 border-indigo-700 text-white rounded-tr-none bg-indigo-600"
                                              : "bg-white border-slate-200 text-slate-800 rounded-tl-none"
                                          }`}
                                        >
                                          {msg.body}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Canned Replies */}
                              <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500">Hazir Sablon:</span>
                                <select
                                  className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600 focus:outline-none"
                                  onChange={(e) => {
                                    const selected = CANNED_REPLIES.find(r => r.id === e.target.value);
                                    if (selected) {
                                      setReplyBody(selected.body);
                                    }
                                    e.target.value = ""; // Reset dropdown
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Seciniz...</option>
                                  {CANNED_REPLIES.map(r => (
                                    <option key={r.id} value={r.id}>{r.title}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Reply Input */}
                              <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
                                <input
                                  type="text"
                                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                  placeholder="Cevabinizi buraya yazın..."
                                  value={replyBody}
                                  onChange={(e) => setReplyBody(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addTicketMessage(ticket.id);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => addTicketMessage(ticket.id)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                                >
                                  Gonder
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-center py-20">
                          <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="text-xs font-bold">Detaylari gormek icin sol panelden bir talep seçin.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ERP TAB */}
                {activeConsoleTab === "ERP" && (
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: API & Quota limits */}
                    <div className="space-y-6">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">API & Kaynak Limitleri</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Aylik API Kotası</label>
                            <input
                              type="number"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editSmsQuota}
                              onChange={(e) => setEditSmsQuota(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Kullanilan API</label>
                            <input
                              type="number"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                              value={editSmsUsed}
                              onChange={(e) => setEditSmsUsed(Number(e.target.value))}
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1 font-semibold">
                            <span>API Istek Tuketim Orani</span>
                            <span className="font-mono font-bold text-slate-700">%{editSmsQuota > 0 ? Math.round((editSmsUsed / editSmsQuota) * 100) : 0}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200">
                            <div
                              className="bg-blue-550 h-2 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(100, editSmsQuota > 0 ? (editSmsUsed / editSmsQuota) * 100 : 0)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Add Ledger Entry Form */}
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Yeni Cari İşlem Ekle</h4>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setLedgerType("CHARGE")}
                              className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-bold border transition-all ${
                                ledgerType === "CHARGE"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                              }`}
                            >
                              + Borc (Fatura)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLedgerType("COLLECTION")}
                              className={`flex-1 py-1.5 text-center rounded-lg text-[10px] font-bold border transition-all ${
                                ledgerType === "COLLECTION"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100"
                              }`}
                            >
                              - deme (Tahsilat)
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">İşlem Kategorisi</label>
                              <select
                                className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white font-bold"
                                value={ledgerCategory}
                                onChange={(e) => setLedgerCategory(e.target.value as any)}
                              >
                                <option value="LICENSE">YILLIK LISANS</option>
                                <option value="SUPPORT">TEKNIK DESTEK</option>
                                <option value="CUSTOM_DEV">ZEL GELISTIRME</option>
                                <option value="SMS_PACK">API EK KOTA PAKETI</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Tutar (TL)</label>
                                <input
                                  type="number"
                                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:bg-white"
                                  placeholder="Tutar"
                                  value={ledgerAmount}
                                  onChange={(e) => setLedgerAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Aciklama</label>
                                <input
                                  type="text"
                                  className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:bg-white"
                                  placeholder="Detaylar..."
                                  value={ledgerDesc}
                                  onChange={(e) => setLedgerDesc(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={addLedgerEntry}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                          >
                            Cari Hareketi İşle
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Ledger List & Net balance */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Cari Hesap Bakiyesi</div>
                          <div className="text-xl font-extrabold text-slate-800 mt-1">
                            {modalNetBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                            modalNetBalance > 0
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {modalNetBalance > 0 ? "Firma Borclu" : "Sifir Bakiye / Alacakli"}
                        </span>
                      </div>

                      {/* Gelir Kirilim Analizi */}
                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Gelir Dağılım Analizi (Toplam Ciro: {erpStats.grandTotal.toLocaleString()} TL)</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {(["LICENSE", "SUPPORT", "CUSTOM_DEV", "SMS_PACK"] as const).map((cat) => {
                            const amount = erpStats.totals[cat] || 0;
                            const pct = erpStats.grandTotal > 0 ? Math.round((amount / erpStats.grandTotal) * 100) : 0;
                            const labelMap = {
                              LICENSE: "Lisans",
                              SUPPORT: "Destek",
                              CUSTOM_DEV: "Geliştirme",
                              SMS_PACK: "API Istek Paketi"
                            };
                            const colorMap = {
                              LICENSE: "bg-indigo-500 text-indigo-700",
                              SUPPORT: "bg-emerald-500 text-emerald-700",
                              CUSTOM_DEV: "bg-purple-500 text-purple-700",
                              SMS_PACK: "bg-blue-500 text-blue-700"
                            };
                            return (
                              <div key={cat} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex flex-col justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{labelMap[cat]}</span>
                                <div className="mt-1 flex items-baseline justify-between gap-1 flex-wrap">
                                  <span className="text-xs font-extrabold text-slate-800">{amount.toLocaleString()} TL</span>
                                  <span className="text-[9px] font-bold text-slate-500">%{pct}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                                  <div
                                    className={`h-1 rounded-full ${colorMap[cat].split(" ")[0]}`}
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Cari Defter Hareketleri</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {editBillingLedger.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Kayitli cari hareket bulunmuyor.</p>
                          ) : (
                            [...editBillingLedger]
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((e) => (
                                <div
                                  key={e.id}
                                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                >
                                  <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400 font-bold">{e.date}</span>
                                      {e.category === "LICENSE" && (
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-extrabold border border-indigo-150">LISANS</span>
                                      )}
                                      {e.category === "SUPPORT" && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-extrabold border border-emerald-150 font-bold">DESTEK</span>
                                      )}
                                      {e.category === "CUSTOM_DEV" && (
                                        <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[8px] font-extrabold border border-violet-150">GELISTIRME</span>
                                      )}
                                      {e.category === "SMS_PACK" && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[8px] font-extrabold border border-blue-150 font-bold">API PAKETI</span>
                                      )}
                                    </div>
                                    <div className="text-slate-700 text-[11px] font-bold mt-1 truncate max-w-[250px]" title={e.description}>
                                      {e.description}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={e.type === "CHARGE" ? "text-amber-600 font-bold font-mono" : "text-emerald-600 font-bold font-mono"}>
                                      {e.type === "CHARGE" ? "+" : "-"}{e.amount.toLocaleString()} TL
                                    </span>
                                    <div className="flex items-center gap-1 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadInvoicePDF(e)}
                                        className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 text-[9px] font-bold transition-all active:scale-95 flex items-center gap-0.5"
                                        title="Fatura PDF Simulasyonu"
                                      >
                                        x PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendInvoiceEmail(e)}
                                        className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 text-[9px] font-bold transition-all active:scale-95 flex items-center gap-0.5"
                                        title="E-Posta Fatura Bildirimi Gonder"
                                      >
                                        S0 Gonder
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => removeLedgerEntry(e.id)}
                                      className="text-slate-400 hover:text-rose-500 font-extrabold text-base pl-1"
                                      title="Sil"
                                    >
                                      
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                {/* ROLES TAB */}
                {activeConsoleTab === "ROLES" && (
                  <div className="p-6 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>x</span> Rol Bazli Modul ve Yetki Sinirlari
                        </h3>
                        <p className="text-[11px] text-slate-400">İşletme bunyesindeki rollerin hangi sistem modullerine erişebileceğini tanımlayın.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3">Rol Adi</th>
                              <th className="py-3 text-center">POS Hizli Satış</th>
                              <th className="py-3 text-center">Teknik Servis</th>
                              <th className="py-3 text-center">Stok Yönetimi</th>
                              <th className="py-3 text-center">E-Fatura Entegrasyonu</th>
                              <th className="py-3 text-center">Cihaz Alımı (Buyback)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const roles = [
                                { key: "MANAGER" as const, label: "Müdür / Yönetici (MANAGER)", desc: "Tüm operasyonel izinlere sahip, şubeleri denetler." },
                                { key: "CASHIER" as const, label: "Kasiyer / Tezgahtar (CASHIER)", desc: "Satış işlemlerini ve basit kasa tahsilatlarini yapar." },
                                { key: "TECHNICIAN" as const, label: "Servis Teknisyeni (TECHNICIAN)", desc: "Arıza teşhisi yapar ve tamir kayıtlarını günceller." },
                                { key: "ACCOUNTANT" as const, label: "Muhasebe Sorumlusu (ACCOUNTANT)", desc: "Giderleri, cari kayitlari ve banka hesaplarini kontrol eder." },
                              ];

                              const modules = [
                                { key: "pos", label: "POS Satış" },
                                { key: "repairs", label: "Teknik Servis" },
                                { key: "stock", label: "Stok" },
                                { key: "invoicing", label: "Faturalama" },
                                { key: "buyback", label: "Cihaz Alımı (Buyback)" },
                              ];

                              return roles.map((role) => {
                                return (
                                  <tr key={role.key} className="hover:bg-slate-50/50">
                                    <td className="py-4 pr-4">
                                      <div className="font-bold text-slate-700">{role.label}</div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">{role.desc}</div>
                                    </td>
                                    {modules.map((mod) => {
                                      const isChecked = (editRolePermissions[role.key] || []).includes(mod.key);
                                      return (
                                        <td key={mod.key} className="py-4 text-center">
                                          <input
                                            type="checkbox"
                                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const currentList = editRolePermissions[role.key] || [];
                                              let newList: string[];
                                              if (e.target.checked) {
                                                newList = [...currentList, mod.key];
                                              } else {
                                                newList = currentList.filter(k => k !== mod.key);
                                              }
                                              setEditRolePermissions({
                                                ...editRolePermissions,
                                                [role.key]: newList
                                              });
                                            }}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-semibold space-y-1">
                        <p> **Yönetici (ADMIN)** rolu ana sistem yoneticisi olup, güvenlik gereği tüm modüllere sınırsız erişim yetkisine sahiptir ve bu tablodan kısıtlanamaz.</p>
                        <p> Bu alanda yapacağınız yetki değişiklikleri, bayinin veritabanında güncellenecek olup bayi kullanıcılarının oturumlarında anında aktif olacaktır.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* USERS TAB */}
                {activeConsoleTab === "USERS" && (
                  <div className="p-6 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>U</span> Kullanıcı Bazlı Modül İstisnaları
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Rol yetkisi bu firmadaki tüm rol üyelerine uygulanır. Buradan tek bir kullanıcıya, rolünden bağımsız olarak ek modül açabilirsiniz
                          (örn. rolü CASHIER olan ama buyback&apos;e erişmesi gereken bir kullanıcı).
                        </p>
                      </div>

                      {tenantUsersLoading ? (
                        <div className="text-xs text-slate-400 py-6 text-center">Kullanıcılar yükleniyor...</div>
                      ) : tenantUsers.length === 0 ? (
                        <div className="text-xs text-slate-400 py-6 text-center">Bu firmaya bağlı kullanıcı bulunamadı.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3">Kullanıcı</th>
                                <th className="py-3">Rol</th>
                                {["pos", "repairs", "stock", "invoicing", "buyback"].map((modKey) => (
                                  <th key={modKey} className="py-3 text-center">
                                    {{
                                      pos: "POS",
                                      repairs: "Teknik Servis",
                                      stock: "Stok",
                                      invoicing: "Faturalama",
                                      buyback: "Buyback",
                                    }[modKey]}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {tenantUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50">
                                  <td className="py-4 pr-4">
                                    <div className="font-bold text-slate-700">{u.fullName}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                                  </td>
                                  <td className="py-4 pr-4 text-slate-500 font-semibold">{u.role}</td>
                                  {["pos", "repairs", "stock", "invoicing", "buyback"].map((modKey) => {
                                    const isOverridden = u.moduleOverrides?.[modKey] === true;
                                    return (
                                      <td key={modKey} className="py-4 text-center">
                                        <input
                                          type="checkbox"
                                          className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-40"
                                          checked={isOverridden}
                                          disabled={savingUserId === u.id}
                                          title="İşaretlenirse bu kullanıcı rolünden bağımsız bu modüle erişir."
                                          onChange={(e) => updateUserModuleOverride(u, modKey, e.target.checked ? true : null)}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-semibold space-y-1">
                        <p> Kutucuk işaretli: bu kullanıcı o modüle rolünden bağımsız erişir. Boş: modül erişimi rolün yetkisine göre belirlenir (bkz. Rol & Yetki Yönetimi sekmesi).</p>
                        <p> Değişiklik, kullanıcının sonraki girişinde veya sayfa yenilemesinde aktif olur.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsoleTab === "AUDIT" && (
                  <div className="p-6 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span>A</span> Denetim Kaydı
                        </h3>
                        <p className="text-[11px] text-slate-400">Bu firmayla ilgili yapılan kritik Studio işlemleri (silme, dondurma, şifre sıfırlama, lisans uzatma vb).</p>
                      </div>
                      {(() => {
                        const tenantAuditLogs = (reports?.auditLogs || []).filter((l: any) => l.targetId === selectedTenantId);
                        if (tenantAuditLogs.length === 0) {
                          return <div className="text-xs text-slate-400 py-6 text-center">Bu firma için kayıtlı denetim işlemi yok.</div>;
                        }
                        return (
                          <div className="space-y-2">
                            {tenantAuditLogs.map((l: any) => (
                              <div key={l.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-700">{l.action}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{new Date(l.createdAt).toLocaleString("tr-TR")}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">{l.detail}</div>
                                <div className="text-[10px] text-slate-400 mt-1">Yapan: {l.actor}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Footer Save & Close buttons */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 mt-auto">
                  {isPlatformOwner && (
                    <button
                      onClick={() => handleDeleteTenant(selectedTenantId, detailData?.customer.fullName || "")}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 mr-auto"
                    >
                      Firmayı Sil (Kalıcı)
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTenantId(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all"
                  >
                    Kapat
                  </button>
                  {isPlatformOwner && (
                    <button
                      onClick={handleSaveTenantDetails}
                      className="px-4 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      Tüm Ayarlari Kaydet
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW TENANT MODAL */}
      {isAddTenantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>x</span> Yeni Bayi / Firma Lisansı Tanımla
              </h3>
              <button onClick={() => setIsAddTenantOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg">
                X
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol Sütun: Cari & Vergi Bilgileri */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">1. Firma & Vergi Bilgileri</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Firma / Bayi Unvanı</label>
                    <input
                      type="text"
                      required
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="Örn: TeknoMarket Zinciri A.S."
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Yetkili Temsilci Adı Soyadı</label>
                    <input
                      type="text"
                      required
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="Örn: Ahmet Yilmaz"
                      value={newAuthorizedPerson}
                      onChange={(e) => setNewAuthorizedPerson(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Telefon</label>
                      <input
                        type="text"
                        required
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        placeholder="05..."
                        value={newTenantPhone}
                        onChange={(e) => setNewTenantPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Şehir / Bölge</label>
                      <input
                        type="text"
                        required
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        placeholder="Örn: Istanbul"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">E-Posta Adresi</label>
                    <input
                      type="email"
                      required
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="Örn: iletisim@teknomarket.com"
                      value={newTenantEmail}
                      onChange={(e) => setNewTenantEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">İlk Giriş Şifresi</label>
                    <input
                      type="password"
                      minLength={6}
                      required
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      placeholder="En az 6 karakter"
                      value={newTenantInitialPassword}
                      onChange={(e) => setNewTenantInitialPassword(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Bayi bu şifre ile ilk giriş yapar, sonra panelden şifresini değiştirebilir.</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">İlk Kullanıcı Rolü</label>
                    <select
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      value={newTenantInitialRole}
                      onChange={(e) => setNewTenantInitialRole(e.target.value as any)}
                    >
                      <option value="PLATFORM_OWNER">PLATFORM_OWNER - Platform Owner</option>
                      <option value="MANAGER">MANAGER - Yönetici</option>
                      <option value="ADMIN">ADMIN - Sistem Yöneticisi</option>
                      <option value="CASHIER">CASHIER - Kasiyer</option>
                      <option value="TECHNICIAN">TECHNICIAN - Teknik Servis</option>
                      <option value="ACCOUNTANT">ACCOUNTANT - Muhasebe</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vergi Dairesi</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        placeholder="Vergi Dairesi"
                        value={newTaxOffice}
                        onChange={(e) => setNewTaxOffice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vergi Numarası</label>
                      <input
                        type="text"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        placeholder="10 Haneli"
                        value={newTaxNumber}
                        onChange={(e) => setNewTaxNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Sütun: Lisans, Kota & Modüller */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">2. Lisans & Sistem Modülleri</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lisans Planı</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        value={newTenantPlan}
                        onChange={(e) => setNewTenantPlan(e.target.value as any)}
                      >
                        <option value="Lite">Lite Plani ({pricing.Lite} TL)</option>
                        <option value="Service">Servis Planı ({pricing.Service} TL)</option>
                        <option value="Pro">Pro Planı ({pricing.Pro} TL)</option>
                        <option value="Enterprise">Enterprise Planı ({pricing.Enterprise} TL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Sözleşme Süresi</label>
                      <select
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        value={newLicenseDuration}
                        onChange={(e) => setNewLicenseDuration(Number(e.target.value) as any)}
                      >
                        <option value={1}>1 Aylik</option>
                        <option value={3}>3 Aylik</option>
                        <option value={6}>6 Aylik</option>
                        <option value={12}>1 Yıllık (İndirimli)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Şube Limiti</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newTenantBranchLimit}
                        onChange={(e) => setNewTenantBranchLimit(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">DB Alanı (GB)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newTenantDbLimit}
                        onChange={(e) => setNewTenantDbLimit(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">API Kotası</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newTenantApiLimit}
                        onChange={(e) => setNewTenantApiLimit(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Modul Secimleri */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider font-semibold">Aktif Edilecek Modüller</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-655 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          checked={newTenantModules.pos}
                          onChange={(e) => setNewTenantModules({ ...newTenantModules, pos: e.target.checked })}
                        />
                        POS Satış Kasa
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-655 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          checked={newTenantModules.repairs}
                          onChange={(e) => setNewTenantModules({ ...newTenantModules, repairs: e.target.checked })}
                        />
                        Teknik Servis
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-655 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          checked={newTenantModules.stock}
                          onChange={(e) => setNewTenantModules({ ...newTenantModules, stock: e.target.checked })}
                        />
                        Stok & Depo
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-655 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          checked={newTenantModules.invoicing}
                          onChange={(e) => setNewTenantModules({ ...newTenantModules, invoicing: e.target.checked })}
                        />
                        E-Fatura Entegrasyonu
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer col-span-2">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-655 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          checked={newTenantModules.buyback}
                          onChange={(e) => setNewTenantModules({ ...newTenantModules, buyback: e.target.checked })}
                        />
                        Cihaz Geri Alım (Buyback)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tutar Hesaplayıcı Özeti */}
              {(() => {
                const basePrice = getPlanBasePrice(newTenantPlan);
                const extraBranches = newTenantBranchLimit > pricing.freeBranchLimit ? (newTenantBranchLimit - pricing.freeBranchLimit) : 0;
                const extraBranchMonthlyPrice = extraBranches * pricing.branchSurchargePrice;
                const totalMonthly = basePrice + extraBranchMonthlyPrice;
                const totalRaw = totalMonthly * newLicenseDuration;
                const discountPct = newLicenseDuration === 12 ? (pricing.addons?.annualDiscountPct || 15) : 0;
                const discountAmount = Math.round(totalRaw * (discountPct / 100));
                const finalAmount = totalRaw - discountAmount;

                return (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div>
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span>x`</span> Sözleşme Fatura Bedeli Özeti
                      </div>
                      <div className="text-indigo-700 font-medium mt-1.5 space-y-0.5">
                        <p>Taban Plan Bedeli: <span className="font-bold">{basePrice.toLocaleString()} TL/ay</span></p>
                        {extraBranches > 0 && (
                          <p>Ek Şube Bedeli: <span className="font-bold">+{extraBranchMonthlyPrice.toLocaleString()} TL/ay</span> ({extraBranches} ek şube için)</p>
                        )}
                        <p>Süre Çarpanı: <span className="font-bold">x{newLicenseDuration} Ay</span></p>
                        {discountPct > 0 && (
                          <p className="text-emerald-700 font-semibold">Yıllık Peşin deme Indirimi: <span className="font-bold">-%{discountPct}</span> (-{discountAmount.toLocaleString()} TL)</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right bg-white p-3 rounded-lg border border-indigo-200 min-w-[140px] shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">ÖDENECEK TUTAR</span>
                      <span className="text-xl font-black text-emerald-600 font-mono tracking-tight">{finalAmount.toLocaleString()} TL</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Sözleşme Başlangıcı: Bugünden itibaren</span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2 justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddTenantOpen(false)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Firma Tanımla ve Lisansla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReasonPromptModal
        open={pendingReasonAction !== null}
        title={
          pendingReasonAction?.type === "DELETE_TENANT"
            ? `"${pendingReasonAction.name}" firmasını kalıcı olarak sil`
            : pendingReasonAction?.type === "TENANT_ADMIN"
              ? `"${pendingReasonAction.name}" tenantını ${pendingReasonAction.action === "FREEZE" ? "dondur" : "aktif et"}`
              : pendingReasonAction?.type === "EXTEND_LICENSE"
                ? `"${pendingReasonAction.item.tenant.fullName}" lisansını 1 yıl uzat`
                : ""
        }
        description={
          pendingReasonAction?.type === "DELETE_TENANT"
            ? "Firmaya ait tüm veriler (şubeler, kasalar, ürünler, satışlar, kullanıcılar) kalıcı olarak silinecek. Bu işlem geri alınamaz."
            : undefined
        }
        confirmLabel={pendingReasonAction?.type === "DELETE_TENANT" ? "Kalıcı Olarak Sil" : "Onayla"}
        danger={pendingReasonAction?.type === "DELETE_TENANT" || (pendingReasonAction?.type === "TENANT_ADMIN" && pendingReasonAction.action === "FREEZE")}
        onConfirm={handleConfirmPendingReasonAction}
        onCancel={() => setPendingReasonAction(null)}
      />
      {confirmDialog}
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-605 border-indigo-600"></div>
      </div>
    }>
      <StudioPageContent />
    </Suspense>
  );
}






