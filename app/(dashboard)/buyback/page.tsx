"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type WizardData = {
  nationalId: string;
  fullName: string;
  phone: string;
  brand: string;
  model: string;
  storage: string;
  imei: string;
  screenCondition: "excellent" | "good" | "bad";
  bodyCondition: "excellent" | "good" | "bad";
  batteryHealth: "above90" | "between80_90" | "below80";
  hasBrokenComponent: "no" | "yes";
  requiresSerialNumber?: boolean;
};

type BuybackDeal = {
  id: string;
  offeredPrice: number;
  agreedPrice: number | null;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "COMPLETED";
  evaluationNote: string | null;
  createdAt?: string;
  customerId?: string;
  customer?: { fullName: string } | null;
  device?: { brand: string; model: string; imei?: string | null } | null;
};
type BuybackDetail = BuybackDeal & {
  customer?: { fullName?: string; phone?: string; nationalId?: string; email?: string | null; notes?: string | null } | null;
  device?: { brand?: string; model?: string; imei?: string | null; conditionNote?: string | null } | null;
};
type ProductOption = { id: string; name: string; salePrice: number; stock: number };

type PricingRule = {
  id: string;
  brand: string;
  modelPattern: string | null;
  basePrice: number;
  excellentBonusPct: number;
  goodBonusPct: number;
  badPenaltyPct: number;
  batteryHighPct: number;
  batteryLowPenalty: number;
  brokenPenaltyPct: number;
  isActive: boolean;
  requiresSerialNumber: boolean;
};

type PricingAuditLog = {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
};
type CatalogQuestion = { label: string; options: Array<{ text: string; value: number }> };
type CatalogItem = {
  id: string;
  category: string;
  brand: string;
  model: string;
  basePrice: number;
  minPrice: number;
  questionSetJson: string;
  requiresSerialNumber?: boolean;
};
type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  district: string;
  iban: string;
  ibanHolder: string;
  address: string;
  consentChecked: boolean;
};
type ImageSlotKey = "front" | "back" | "top" | "bottom";

type PdfSettings = {
  template1DealerName: string;
  template1PartnerName: string;
  template2CompanyTradeName: string;
  template2CompanyTaxInfo: string;
  template2CompanyAddress: string;
  template2CompanyPhone: string;
  template2MaterialType: string;
};

const initialData: WizardData = {
  nationalId: "",
  fullName: "",
  phone: "",
  brand: "Apple",
  model: "",
  storage: "128GB",
  imei: "",
  screenCondition: "good",
  bodyCondition: "good",
  batteryHealth: "between80_90",
  hasBrokenComponent: "no",
  requiresSerialNumber: true,
};

function inferStorageFromModel(model: string) {
  const match = model.match(/(\d+\s?(GB|TB))/i);
  return match ? match[1].toUpperCase().replace(/\s+/g, "") : "MODEL_ICINDE";
}

const steps = ["CIHAZ", "CIHAZ DURUMU", "ILETISIM VE ONAY"];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10";
const primaryBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45";
const secondaryBtnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45";
const iconBtnCls = "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900";
const pdfBtnCls = "inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600";
const thCls = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500";
const tdCls = "px-4 py-3 text-slate-700";

function IconRefresh() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M4.5 15a8 8 0 0014.5 3.5M19.5 9A8 8 0 005 5.5" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconSave() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

const initialRule = {
  brand: "Apple",
  modelPattern: "",
  basePrice: 10000,
  excellentBonusPct: 0.2,
  goodBonusPct: 0,
  badPenaltyPct: 0.2,
  batteryHighPct: 0.08,
  batteryLowPenalty: 0.18,
  brokenPenaltyPct: 0.3,
  requiresSerialNumber: true,
};

export default function BuybackOperationsPage() {
  const router = useRouter();
  const buybackOpsEnabled = (process.env.NEXT_PUBLIC_BUYBACK_NEW_OPS_ENABLED ?? "true").toLowerCase() === "true";
  const erpSyncEnabled = (process.env.NEXT_PUBLIC_BUYBACK_ERP_SYNC_ENABLED ?? "true").toLowerCase() === "true";

  const [step, setStep] = useState(1);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<WizardData>(initialData);
  const [offeredPrice, setOfferedPrice] = useState(10000);

  const [deals, setDeals] = useState<BuybackDeal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<BuybackDeal["status"]>("APPROVED");
  const [loadingDeals, setLoadingDeals] = useState(false);

  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleForm, setRuleForm] = useState(initialRule);
  const [erpJson, setErpJson] = useState('{ "pricingRules": [] }');
  const [csvData, setCsvData] = useState("kategori,marka,model,fiyat,min_fiyat,soru_seti\ntelefon,Apple,iPhone 13 128 GB,25000,3750,\"[]\"");
  const [csvFileName, setCsvFileName] = useState("");
  const [simulationBreakdown, setSimulationBreakdown] = useState<{ basePrice: number; lines: Array<{ note: string; multiplier: number }>; offeredPrice: number } | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<"telefon" | "macbook" | "tablet" | "watch">("telefon");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, number>>({});
  const [contact, setContact] = useState<ContactForm>({
    firstName: "",
    lastName: "",
    email: "",
    city: "",
    district: "",
    iban: "TR",
    ibanHolder: "",
    address: "",
    consentChecked: false,
  });
  const [imageFiles, setImageFiles] = useState<Record<ImageSlotKey, string>>({ front: "", back: "", top: "", bottom: "" });
  const [pricingLogs, setPricingLogs] = useState<PricingAuditLog[]>([]);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
    template1DealerName: "Merkez",
    template1PartnerName: "Is Ortagi",
    template2CompanyTradeName: "",
    template2CompanyTaxInfo: "/",
    template2CompanyAddress: "",
    template2CompanyPhone: "",
    template2MaterialType: "Cep Telefonu",
  });
  const [activePanel, setActivePanel] = useState<"wizard" | "pool" | "pricing" | "ops" | "pdf" | "opspro">("opspro");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tradeInProductId, setTradeInProductId] = useState("");
  const [tradeInPaymentMethod, setTradeInPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">("CASH");
  const [tradeInQuote, setTradeInQuote] = useState<{ grossAmount: number; differenceAmount: number; buybackCredit: number } | null>(null);
  const [poolSearch, setPoolSearch] = useState("");
  const [poolStatus, setPoolStatus] = useState<"ALL" | BuybackDeal["status"]>("ALL");
  const [detailDeal, setDetailDeal] = useState<BuybackDeal | null>(null);
  const [detailTab, setDetailTab] = useState<"documents" | "qa">("documents");
  const [detailData, setDetailData] = useState<BuybackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(true);

  useEffect(() => {
    router.replace("/buyback/backoffice");
  }, [router]);

  const refreshDeals = useCallback(async () => {
    setLoadingDeals(true);
    try {
      const res = await fetch("/api/buybacks");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Teklifler yuklenemedi");
      setDeals(
        (json as any[]).map((d) => ({
          ...d,
          offeredPrice: Number(d.offeredPrice),
          agreedPrice: d.agreedPrice == null ? null : Number(d.agreedPrice),
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Teklifler yuklenemedi");
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  const refreshRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/offer-pricing-rules");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fiyat kurallari yuklenemedi");
      setRules((json as any[]).map((r) => normalizeRule(r)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fiyat kurallari yuklenemedi");
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/buyback/catalog");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Katalog yuklenemedi");
      const items = Array.isArray(json.items) ? json.items : [];
      setCatalogItems(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Katalog yuklenemedi");
    }
  }, []);

  const refreshPricingLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/buyback/pricing-audit");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fiyat denetim kayitlari yuklenemedi");
      setPricingLogs(Array.isArray(json) ? json : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fiyat denetim kayitlari yuklenemedi");
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Urunler yuklenemedi");
      const items = (Array.isArray(json) ? json : []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name),
        salePrice: Number(p.salePrice),
        stock: Number(p.stock ?? 0),
      }));
      setProducts(items);
      if (items.length > 0 && !tradeInProductId) setTradeInProductId(items[0].id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Urunler yuklenemedi");
    }
  }, [tradeInProductId]);

  const refreshPdfSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/system/pdf-settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "PDF ayarlari yuklenemedi");
      setPdfSettings(json);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF ayarlari yuklenemedi");
    }
  }, []);

  useEffect(() => {
    if (!buybackOpsEnabled) return;
    void refreshDeals();
    void refreshRules();
    void refreshCatalog();
    void refreshPricingLogs();
    void refreshPdfSettings();
    void refreshProducts();
  }, [buybackOpsEnabled, refreshDeals, refreshRules, refreshCatalog, refreshPricingLogs, refreshPdfSettings, refreshProducts]);

  useEffect(() => {
    const selected = catalogItems.find((x) => x.brand === data.brand && x.model === data.model);
    if (!selected) return;
    const base = Number(selected.basePrice || 0);
    const min = Number(selected.minPrice || 0);
    const totalDeduction = Object.values(questionAnswers).reduce((sum, n) => sum + Number(n || 0), 0);
    const computed = Math.max(min > 0 ? min : 0, Math.round((base + totalDeduction) / 50) * 50);
    setOfferedPrice(computed);
    const lines = Object.entries(questionAnswers).map(([label, value]) => ({ note: `${label}: ${value.toLocaleString("tr-TR")} TL`, multiplier: 1 }));
    setSimulationBreakdown({ basePrice: base, lines, offeredPrice: computed });
    setData((p) => ({ ...p, requiresSerialNumber: selected.requiresSerialNumber ?? true }));
  }, [catalogItems, data.brand, data.model, questionAnswers]);

  const brandOptions = useMemo(() => Array.from(new Set(catalogItems.map((x) => x.brand))).sort((a, b) => a.localeCompare(b, "tr")), [catalogItems]);
  const modelOptions = useMemo(() => catalogItems.filter((x) => x.brand === data.brand).map((x) => x.model), [catalogItems, data.brand]);
  const selectedCatalogItem = useMemo(() => catalogItems.find((x) => x.brand === data.brand && x.model === data.model), [catalogItems, data.brand, data.model]);
  const modelQuestions = useMemo<CatalogQuestion[]>(() => {
    if (!selectedCatalogItem?.questionSetJson) return [];
    try {
      const parsed = JSON.parse(selectedCatalogItem.questionSetJson);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((q) => q && typeof q.label === "string" && Array.isArray(q.options))
        .map((q) => ({
          label: q.label,
          options: q.options
            .filter((o: any) => o && typeof o.text === "string")
            .map((o: any) => ({ text: o.text, value: Number(o.value || 0) })),
        }));
    } catch {
      return [];
    }
  }, [selectedCatalogItem]);
  const missingQuestionCount = useMemo(() => {
    if (step !== 2) return 0;
    return modelQuestions.filter((q) => questionAnswers[q.label] == null).length;
  }, [modelQuestions, questionAnswers, step]);

  useEffect(() => {
    if (!tradeInEnabled || !tradeInProductId) {
      setTradeInQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/trade-in/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buybackCredit: offeredPrice, productId: tradeInProductId, quantity: 1 }),
        });
        const json = await res.json();
        if (res.ok) {
          setTradeInQuote({
            grossAmount: Number(json.grossAmount ?? 0),
            differenceAmount: Number(json.differenceAmount ?? 0),
            buybackCredit: Number(json.buybackCredit ?? offeredPrice),
          });
        }
      } catch {
        // noop
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [tradeInEnabled, tradeInProductId, offeredPrice]);

  const stats = useMemo(() => {
    return {
      total: deals.length,
      draft: deals.filter((d) => d.status === "DRAFT").length,
      approved: deals.filter((d) => d.status === "APPROVED").length,
      completed: deals.filter((d) => d.status === "COMPLETED").length,
    };
  }, [deals]);
  const filteredDeals = useMemo(() => {
    const term = poolSearch.trim().toLowerCase();
    return deals.filter((d) => {
      if (poolStatus !== "ALL" && d.status !== poolStatus) return false;
      if (!term) return true;
      const bag = [
        d.id,
        d.customer?.fullName ?? "",
        d.device?.brand ?? "",
        d.device?.model ?? "",
        d.device?.imei ?? "",
        d.evaluationNote ?? "",
      ].join(" ").toLowerCase();
      return bag.includes(term);
    });
  }, [deals, poolSearch, poolStatus]);
  const controlRows = useMemo(() => {
    const totalOffer = deals.reduce((s, d) => s + Number(d.offeredPrice || 0), 0);
    const totalFinal = deals.reduce((s, d) => s + Number(d.agreedPrice ?? d.offeredPrice ?? 0), 0);
    const approvalRate = deals.length > 0 ? Math.round((deals.filter((d) => d.status === "APPROVED" || d.status === "COMPLETED").length / deals.length) * 100) : 0;
    return { totalOffer, totalFinal, approvalRate };
  }, [deals]);

  function normalizeRule(r: any): PricingRule {
    return {
      id: r.id,
      brand: r.brand,
      modelPattern: r.modelPattern ?? null,
      basePrice: Number(r.basePrice),
      excellentBonusPct: Number(r.excellentBonusPct),
      goodBonusPct: Number(r.goodBonusPct),
      badPenaltyPct: Number(r.badPenaltyPct),
      batteryHighPct: Number(r.batteryHighPct),
      batteryLowPenalty: Number(r.batteryLowPenalty),
      brokenPenaltyPct: Number(r.brokenPenaltyPct),
      isActive: Boolean(r.isActive),
      requiresSerialNumber: r.requiresSerialNumber === undefined ? true : Boolean(r.requiresSerialNumber),
    };
  }

  async function autoFillCustomer() {
    if (data.nationalId.trim().length !== 11) return;
    setLoadingCustomer(true);
    try {
      const res = await fetch(`/api/customers/by-national-id/${data.nationalId}`);
      const json = await res.json();
      if (json.found && json.customer) {
        const fullName = json.customer.fullName ?? data.fullName;
        const [firstName, ...rest] = String(fullName).trim().split(" ");
        setData((prev) => ({ ...prev, fullName, phone: json.customer.phone ?? prev.phone }));
        setContact((prev) => ({ ...prev, firstName: firstName ?? prev.firstName, lastName: rest.join(" ") || prev.lastName, email: json.customer.email ?? prev.email }));
        toast.success("Musteri bilgileri otomatik getirildi");
      } else {
        toast.info("Bu TC no ile kayit bulunamadi");
      }
    } finally {
      setLoadingCustomer(false);
    }
  }

  async function handleWizardSubmit() {
    setSubmitting(true);
    try {
      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: data.nationalId,
          fullName: `${contact.firstName} ${contact.lastName}`.trim() || data.fullName,
          phone: data.phone,
          email: contact.email || undefined,
          notes: `Sehir:${contact.city || "-"} | Ilce:${contact.district || "-"} | IBAN:${contact.iban || "-"} | Hesap Sahibi:${contact.ibanHolder || "-"} | Adres:${contact.address || "-"} | Gorseller:${Object.entries(imageFiles).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(", ") || "-"}`,
        }),
      });
      const customerJson = await customerRes.json();
      if (!customerRes.ok) throw new Error(customerJson.error ?? "Musteri kaydedilemedi");

      const deviceRes = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerJson.id,
          brand: data.brand,
          model: data.model,
          storage: data.storage,
          imei: data.imei,
          conditionNote: Object.keys(questionAnswers).length > 0
            ? Object.entries(questionAnswers).map(([k, v]) => `${k}:${v}`).join(" | ")
            : `Ekran:${data.screenCondition} | Kasa:${data.bodyCondition} | Pil:${data.batteryHealth} | Arizali Aksam:${data.hasBrokenComponent === "yes" ? "Var" : "Yok"}`,
          isSecondHandStock: true,
        }),
      });
      const deviceJson = await deviceRes.json();
      if (!deviceRes.ok) throw new Error(deviceJson.error ?? "Cihaz stoga eklenemedi");

      const res = await fetch("/api/buyback-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          storage: inferStorageFromModel(data.model),
          customerId: customerJson.id,
          deviceId: deviceJson.id,
          hasBrokenComponent: data.hasBrokenComponent === "yes",
          offeredPrice,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Islem kaydedilemedi");

      if (tradeInEnabled && tradeInProductId) {
        const tradeRes = await fetch("/api/trade-in/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buybackCredit: offeredPrice,
            productId: tradeInProductId,
            quantity: 1,
            paymentMethod: tradeInPaymentMethod,
            customerId: customerJson.id,
            note: `Buyback+Takas / Cihaz:${data.brand} ${data.model}`,
          }),
        });
        const tradeJson = await tradeRes.json();
        if (!tradeRes.ok) throw new Error(tradeJson.error ?? "Takas checkout tamamlanamadi");
        toast.success(`Takas tamamlandi. Fark: ${Number(tradeJson.differenceAmount ?? 0).toLocaleString("tr-TR")} TL`);
      }

      toast.success(json.message ?? "Sozlesme onaylandi");
      setData(initialData);
      setContact({ firstName: "", lastName: "", email: "", city: "", district: "", iban: "TR", ibanHolder: "", address: "", consentChecked: false });
      setImageFiles({ front: "", back: "", top: "", bottom: "" });
      setQuestionAnswers({});
      setTradeInEnabled(false);
      setTradeInQuote(null);
      setStep(1);
      await refreshDeals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bir hata olustu");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDeal(item: BuybackDeal) {
    try {
      const res = await fetch(`/api/buybacks/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: item.status, agreedPrice: item.agreedPrice, evaluationNote: item.evaluationNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Teklif guncellenemedi");
      toast.success("Teklif guncellendi");
      await refreshDeals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Teklif guncellenemedi");
    }
  }

  async function runBulkStatusUpdate() {
    if (selectedIds.length === 0) {
      toast.info("Toplu islem icin en az bir kayit secin");
      return;
    }

    try {
      const res = await fetch("/api/buybacks/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Toplu durum guncellenemedi");
      toast.success(`Toplu guncelleme tamamlandi (${json.updatedCount})`);
      setSelectedIds([]);
      await refreshDeals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Toplu durum guncellenemedi");
    }
  }

  async function createRule() {
    setCreatingRule(true);
    try {
      const res = await fetch("/api/offer-pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ruleForm,
          modelPattern: ruleForm.modelPattern.trim() || null,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fiyat kurali olusturulamadi");
      toast.success("Fiyat kurali olusturuldu");
      setRuleForm(initialRule);
      await refreshRules();
      await refreshPricingLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fiyat kurali olusturulamadi");
    } finally {
      setCreatingRule(false);
    }
  }

  async function saveRule(rule: PricingRule) {
    try {
      const res = await fetch(`/api/offer-pricing-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kural guncellenemedi");
      toast.success("Kural guncellendi");
      await refreshRules();
      await refreshPricingLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kural guncellenemedi");
    }
  }

  async function deleteRule(id: string) {
    try {
      const res = await fetch(`/api/offer-pricing-rules/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kural silinemedi");
      toast.success("Kural silindi");
      await refreshRules();
      await refreshPricingLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kural silinemedi");
    }
  }

  async function savePdfSettings() {
    try {
      const res = await fetch("/api/admin/system/pdf-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfSettings),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "PDF ayarlari kaydedilemedi");
      toast.success("PDF ayarlari kaydedildi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF ayarlari kaydedilemedi");
    }
  }

  async function processNotificationQueue() {
    try {
      const res = await fetch("/api/buyback/notifications/process", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kuyruk islenemedi");
      toast.success(`Kuyruk islendi: ${json.sent} gonderildi`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kuyruk islenemedi");
    }
  }

  async function runErpSync() {
    try {
      const payload = JSON.parse(erpJson);
      const res = await fetch("/api/buyback/erp-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ERP sync basarisiz");
      toast.success(`ERP sync tamamlandi: +${json.inserted} / ~${json.updated}`);
      await refreshRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ERP sync basarisiz");
    }
  }

  async function runCsvImport() {
    try {
      const res = await fetch("/api/buyback/import/pricing-csv", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csvData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "CSV import basarisiz");
      const skipped = Number(json.skippedNonPhone || 0);
      toast.success(`CSV import tamamlandi: +${json.inserted} / ~${json.updated}${skipped > 0 ? ` / atlanan:${skipped}` : ""}`);
      await refreshRules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import basarisiz");
    }
  }

  function openDealPdf(dealId: string, templateNo: 1 | 2 | 3) {
    const url = `/api/buyback/documents/${dealId}/template/${templateNo}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
  function exportPoolCsv() {
    const header = ["BuybackID", "Durum", "Musteri", "Cihaz", "Teklif", "Anlasilan", "Tarih"];
    const rows = filteredDeals.map((d) => [
      d.id,
      d.status,
      d.customer?.fullName ?? "",
      d.device ? `${d.device.brand} ${d.device.model}` : "",
      Number(d.offeredPrice).toFixed(2),
      d.agreedPrice == null ? "" : Number(d.agreedPrice).toFixed(2),
      d.createdAt ? new Date(d.createdAt).toLocaleDateString("tr-TR") : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buyback-operasyon-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function openDetail(deal: BuybackDeal) {
    setDetailDeal(deal);
    setDetailTab("documents");
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/buybacks/${deal.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Detay yuklenemedi");
      setDetailData(json as BuybackDetail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Detay yuklenemedi");
    } finally {
      setDetailLoading(false);
    }
  }
  function parseImageCards(notes?: string | null) {
    if (!notes) return [];
    const marker = "Gorseller:";
    const idx = notes.indexOf(marker);
    if (idx < 0) return [];
    const raw = notes.slice(idx + marker.length).trim();
    if (!raw || raw === "-") return [];
    return raw.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
      const [slot, ...rest] = part.split(":");
      return { slot: slot || "gorsel", file: rest.join(":") || "Dosya" };
    });
  }

  async function handleCsvFileChange(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) {
        toast.error("Secilen CSV dosyasi bos.");
        return;
      }
      setCsvData(text);
      setCsvFileName(file.name);
      toast.success(`CSV yuklendi: ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV dosyasi okunamadi");
    }
  }

  const tabs: Array<{ key: typeof activePanel; label: string }> = [
    { key: "opspro", label: "Operasyon Pro" },
    { key: "pool", label: "Teklif Havuzu" },
    { key: "wizard", label: "Sihirbaz" },
    { key: "pricing", label: "Fiyat Motoru" },
    { key: "ops", label: "Bildirim/ERP" },
    { key: "pdf", label: "PDF/Gecmis" },
  ];

  return (
    <section className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Buyback Surec ve Operasyon Merkezi</h2>
        <p className="mt-1 text-sm text-slate-500">Ikinci el alim tekliflerini, fiyat motorunu ve ERP/PDF sureclerini tek ekrandan yonetin.</p>
      </div>

      {!buybackOpsEnabled && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
          Buyback yeni operasyon modulu su an pasif.
        </div>
      )}
      {buybackOpsEnabled && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map((tab) => {
            const active = activePanel === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${active ? "text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                style={active ? { background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" } : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Toplam Teklif" value={stats.total} />
        <StatCard label="Taslak" value={stats.draft} />
        <StatCard label="Onayli" value={stats.approved} />
        <StatCard label="Tamamlanan" value={stats.completed} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Operasyon Kontrol Merkezi</h3>
            <p className="mt-1 text-[13px] text-slate-500">Buyback, takas, PDF, ERP ve kuyruk sureclerinin tek ekrandan yonetim ozeti</p>
          </div>
          <button
            onClick={() => setShowControlCenter((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {showControlCenter ? "Daralt" : "Genislet"}
            <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${showControlCenter ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {showControlCenter && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Toplam Teklif Hacmi</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-slate-900">{Math.round(controlRows.totalOffer).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Final Bedel Toplami</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-slate-900">{Math.round(controlRows.totalFinal).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Onay Orani</p>
                <p className="mt-1.5 font-mono text-xl font-bold text-slate-900">%{controlRows.approvalRate}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Modul Durumu</p>
                <p className="mt-1.5 text-sm font-bold text-slate-900">Buyback {buybackOpsEnabled ? "AKTIF" : "PASIF"} / ERP {erpSyncEnabled ? "AKTIF" : "PASIF"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button onClick={() => setActivePanel("wizard")} className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500">Sihirbaz Operasyonu</button>
              <button onClick={() => setActivePanel("pool")} className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500">Havuz ve Detay Yonetimi</button>
              <button onClick={() => setActivePanel("ops")} className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500">Kuyruk / ERP Merkezi</button>
              <button onClick={() => setActivePanel("pdf")} className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500">PDF ve Gecmis Merkezi</button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-sm font-bold text-slate-900">Canli Gelisim Kapsami</p>
              <div className="mt-2 space-y-1.5">
                {[
                  "CSV telefon importu + soru kirilim katalogu",
                  "Dinamik sihirbaz (soru zorunlulugu + teklif karti)",
                  "Buyback + takas quote/checkout akisi",
                  "P1/P2/P3 PDF uretimi ve dokuman erisimi",
                  "Detay modal: belgeler + soru/cevap + operasyon ozeti",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2 text-[13px] text-slate-600">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {buybackOpsEnabled && activePanel === "wizard" && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-slate-900">1) Buyback Sihirbazi</h3>
        <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {steps.map((s, idx) => {
            const active = step === idx + 1;
            return (
              <div
                key={s}
                className={`rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-all duration-200 ${active ? "text-white shadow-md" : "border border-slate-200 text-slate-500"}`}
                style={active ? { background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" } : undefined}
              >
                {idx + 1}. {s}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,320px)]">
            <div>
              {step === 1 && <StepOne
                data={data}
                setData={setData}
                selectedDeviceType={selectedDeviceType}
                onDeviceTypeChange={setSelectedDeviceType}
                brandOptions={brandOptions}
                modelOptions={modelOptions}
              />}
              {step === 2 && <StepTwo
                questions={modelQuestions}
                answers={questionAnswers}
                setAnswer={(label, value) => setQuestionAnswers((prev) => ({ ...prev, [label]: value }))}
              />}
              {step === 3 && <StepThree
                data={data}
                setData={setData}
                autoFillCustomer={autoFillCustomer}
                loadingCustomer={loadingCustomer}
                offeredPrice={offeredPrice}
                submitting={submitting}
                contact={contact}
                setContact={setContact}
                imageFiles={imageFiles}
                setImageFiles={setImageFiles}
                products={products}
                tradeInEnabled={tradeInEnabled}
                setTradeInEnabled={setTradeInEnabled}
                tradeInProductId={tradeInProductId}
                setTradeInProductId={setTradeInProductId}
                tradeInPaymentMethod={tradeInPaymentMethod}
                setTradeInPaymentMethod={setTradeInPaymentMethod}
                tradeInQuote={tradeInQuote}
                onSubmit={handleWizardSubmit}
              />}
            </div>
            <aside className="self-start rounded-2xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-900/20">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100">Tahmini Teklif</p>
              <p className="mt-2 font-mono text-4xl font-black">{offeredPrice.toLocaleString("tr-TR")} TL</p>
              <p className="mt-2 text-xs text-blue-100">Secimlere gore anlik hesaplanir.</p>
              {step === 2 && missingQuestionCount > 0 ? (
                <p className="mt-3 text-xs font-semibold text-amber-200">{missingQuestionCount} soru daha cevaplanmali.</p>
              ) : null}
            </aside>
          </div>

          <div className="mt-4 flex justify-between">
            <button
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              Geri
            </button>
            {step < 3 && (
              <button
                disabled={step === 2 && modelQuestions.length > 0 && missingQuestionCount > 0}
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {step === 1 ? "Sorulara Gec" : "Iletisim ve Onay"}
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>}

      {buybackOpsEnabled && activePanel === "pool" && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-slate-900">2) Teklif Operasyon Havuzu</h3>
        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Toplam Buyback" value={deals.length} />
          <StatCard label="Bekleyen Islem" value={deals.filter((d) => d.status === "DRAFT").length} />
          <StatCard label="Toplam Teklif (TL)" value={Math.round(deals.reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
          <StatCard label="Bugun Islem" value={deals.filter((d) => d.createdAt && new Date(d.createdAt).toDateString() === new Date().toDateString()).length} />
        </div>
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <input className={inputCls} placeholder="Buyback ID, musteri, seri no..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
            <select className={inputCls} value={poolStatus} onChange={(e) => setPoolStatus(e.target.value as "ALL" | BuybackDeal["status"])}>
              <option value="ALL">Tum Durumlar</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <button onClick={() => { setPoolSearch(""); setPoolStatus("ALL"); }} className={secondaryBtnCls}>Temizle</button>
            <button onClick={exportPoolCsv} className={primaryBtnCls}>
              <IconDownload /> Excele Aktar
            </button>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <select className={`${inputCls} max-w-[220px]`} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as BuybackDeal["status"])}>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <button onClick={runBulkStatusUpdate} className={primaryBtnCls}>Secilenleri Guncelle</button>
          <button onClick={() => void refreshDeals()} className={secondaryBtnCls}>
            <IconRefresh /> Listeyi Yenile
          </button>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          {loadingDeals ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Teklifler yukleniyor...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Henuz ikinci el teklifi yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thCls}><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === deals.length} onChange={(e) => setSelectedIds(e.target.checked ? deals.map((d) => d.id) : [])} /></th>
                    <th className={thCls}>Musteri</th>
                    <th className={thCls}>Cihaz</th>
                    <th className={thCls}>Teklif</th>
                    <th className={thCls}>Anlasilan</th>
                    <th className={thCls}>Durum</th>
                    <th className={thCls}>Not</th>
                    <th className={thCls}>PDF</th>
                    <th className={thCls}>Kaydet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                      <td className={tdCls}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                          }
                        />
                      </td>
                      <td className={tdCls}>{item.customer?.fullName ?? "-"}</td>
                      <td className={tdCls}>{item.device ? `${item.device.brand} ${item.device.model}` : "-"}</td>
                      <td className={`${tdCls} font-mono`}>{Number(item.offeredPrice).toFixed(2)} TL</td>
                      <td className={tdCls}>
                        <input
                          className={`${inputCls} font-mono`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.agreedPrice ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            setDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, agreedPrice: raw === "" ? null : Number(raw) } : d)));
                          }}
                        />
                      </td>
                      <td className={tdCls}>
                        <select
                          className={inputCls}
                          value={item.status}
                          onChange={(e) => setDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, status: e.target.value as BuybackDeal["status"] } : d)))}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </td>
                      <td className={tdCls}>
                        <input
                          className={inputCls}
                          value={item.evaluationNote ?? ""}
                          onChange={(e) => setDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, evaluationNote: e.target.value } : d)))}
                        />
                      </td>
                      <td className={tdCls}>
                        <div className="flex gap-1.5">
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 1)}>P1</button>
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 2)}>P2</button>
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 3)}>P3</button>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex gap-1.5">
                          <button className={iconBtnCls} title="Detay" onClick={() => void openDetail(item)}><IconEye /></button>
                          <button className={primaryBtnCls} onClick={() => void saveDeal(item)}><IconSave /> Kaydet</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>}
      {detailDeal && (
        <div className="fixed inset-0 z-[60] overflow-auto bg-slate-950/45 px-[2vw] py-[4vh] backdrop-blur-sm">
          <div className="mx-auto w-[min(1300px,96vw)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h3 className="font-mono text-base font-bold text-slate-900">Buyback ID: {detailDeal.id}</h3>
                <StatusBadge status={detailDeal.status} />
              </div>
              <button className={iconBtnCls} onClick={() => setDetailDeal(null)}><IconX /></button>
            </div>
            <div className="mt-3.5 flex gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <button
                onClick={() => setDetailTab("documents")}
                className={`flex-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${detailTab === "documents" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                Belgeler
              </button>
              <button
                onClick={() => setDetailTab("qa")}
                className={`flex-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${detailTab === "qa" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                Sorular ve Cevaplar
              </button>
            </div>
            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DetailCard
                title="Cihaz Bilgileri"
                lines={[
                  `Buyback ID: ${detailDeal.id}`,
                  `Tarih: ${detailDeal.createdAt ? new Date(detailDeal.createdAt).toLocaleString("tr-TR") : "-"}`,
                  `Cihaz: ${detailData?.device ? `${detailData.device.brand} ${detailData.device.model}` : (detailDeal.device ? `${detailDeal.device.brand} ${detailDeal.device.model}` : "-")}`,
                  `Seri/IMEI: ${detailData?.device?.imei ?? detailDeal.device?.imei ?? "-"}`,
                ]}
              />
              <DetailCard
                title="Musteri Bilgileri"
                lines={[
                  `Musteri: ${detailData?.customer?.fullName ?? detailDeal.customer?.fullName ?? "-"}`,
                  `Telefon: ${detailData?.customer?.phone ?? "-"}`,
                  `TC: ${detailData?.customer?.nationalId ?? "-"}`,
                  `E-posta: ${detailData?.customer?.email ?? "-"}`,
                ]}
              />
              <DetailCard
                title="Islem Detayi"
                lines={[
                  `Durum: ${statusLabel(detailDeal.status)}`,
                  `On Teklif: ${Number(detailDeal.offeredPrice).toLocaleString("tr-TR")} TL`,
                  `Final Teklif: ${(detailDeal.agreedPrice ?? detailDeal.offeredPrice).toLocaleString("tr-TR")} TL`,
                  `Degerlendirme: ${detailDeal.evaluationNote ?? "-"}`,
                ]}
              />
            </div>
            {detailLoading && <div className="mt-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">Detay yukleniyor...</div>}
            {detailTab === "documents" ? (
              <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <h4 className="text-sm font-bold text-slate-900">PDFler</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className={secondaryBtnCls} onClick={() => openDealPdf(detailDeal.id, 1)}>Sozlesme (P1)</button>
                  <button className={secondaryBtnCls} onClick={() => openDealPdf(detailDeal.id, 2)}>Ozet (P2)</button>
                  <button className={secondaryBtnCls} onClick={() => openDealPdf(detailDeal.id, 3)}>Alim Satim Belgesi (P3)</button>
                </div>
                <h4 className="mt-4 text-sm font-bold text-slate-900">Gorseller</h4>
                <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {parseImageCards(detailData?.customer?.notes).length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">Kayitli gorsel metadata bulunamadi.</div>
                  ) : parseImageCards(detailData?.customer?.notes).map((img, idx) => (
                    <div key={`${img.slot}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                      <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-lg bg-slate-100 text-slate-400">
                        <IconImage />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{img.slot}</div>
                      <div className="text-xs text-slate-500">{img.file}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <h4 className="text-sm font-bold text-slate-900">Soru/Cevap Ozeti</h4>
                <p className="mt-1.5 text-sm text-slate-600">{detailData?.device?.conditionNote || detailDeal.evaluationNote || "Bu kayit icin soru/cevap notu bulunmuyor."}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {buybackOpsEnabled && activePanel === "pricing" && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-slate-900">3) Fiyat Motoru Kurallari</h3>
        {simulationBreakdown && (
          <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <h4 className="text-sm font-bold text-slate-900">Teklif Simulasyonu</h4>
            <p className="mt-1.5 text-sm text-slate-600">Baz Fiyat: <span className="font-mono">{simulationBreakdown.basePrice.toLocaleString("tr-TR")} TL</span></p>
            {simulationBreakdown.lines.map((line, idx) => (
              <p key={`${line.note}-${idx}`} className="mt-1 text-sm text-slate-600">
                {line.note} <span className="font-mono">x{line.multiplier.toFixed(2)}</span>
              </p>
            ))}
            <p className="mt-2 text-sm font-bold text-slate-900">Toplam Teklif: <span className="font-mono">{simulationBreakdown.offeredPrice.toLocaleString("tr-TR")} TL</span></p>
          </div>
        )}

        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <h4 className="text-sm font-bold text-slate-900">Yeni Kural Ekle</h4>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <input className={inputCls} placeholder="Marka" value={ruleForm.brand} onChange={(e) => setRuleForm((p) => ({ ...p, brand: e.target.value }))} />
            <input className={inputCls} placeholder="Model Pattern (ops.)" value={ruleForm.modelPattern} onChange={(e) => setRuleForm((p) => ({ ...p, modelPattern: e.target.value }))} />
            <input className={`${inputCls} font-mono`} type="number" placeholder="Base Price" value={ruleForm.basePrice} onChange={(e) => setRuleForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} />
            <button className={primaryBtnCls} disabled={creatingRule} onClick={() => void createRule()}>{creatingRule ? "Olusturuluyor..." : "Kural Ekle"}</button>
          </div>
          <label className="mt-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={ruleForm.requiresSerialNumber}
              onChange={(e) => setRuleForm((p) => ({ ...p, requiresSerialNumber: e.target.checked }))}
            />
            Seri No (IMEI) Gerekli
          </label>
        </div>

        <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200">
          {loadingRules ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Kurallar yukleniyor...</div>
          ) : rules.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Henuz fiyat kurali yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thCls}>Marka</th>
                    <th className={thCls}>Model</th>
                    <th className={thCls}>Base</th>
                    <th className={thCls}>Excellent</th>
                    <th className={thCls}>Good</th>
                    <th className={thCls}>Bad</th>
                    <th className={thCls}>Pil+</th>
                    <th className={thCls}>Pil-</th>
                    <th className={thCls}>Ariza-</th>
                    <th className={thCls}>Aktif</th>
                    <th className={thCls}>Seri No</th>
                    <th className={thCls}>Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="transition-colors hover:bg-blue-50/30">
                      <td className={tdCls}><input className={inputCls} value={rule.brand} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, brand: e.target.value } : r)))} /></td>
                      <td className={tdCls}><input className={inputCls} value={rule.modelPattern ?? ""} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, modelPattern: e.target.value } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" value={rule.basePrice} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, basePrice: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.excellentBonusPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, excellentBonusPct: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.goodBonusPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, goodBonusPct: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.badPenaltyPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, badPenaltyPct: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.batteryHighPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, batteryHighPct: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.batteryLowPenalty} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, batteryLowPenalty: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input className={`${inputCls} font-mono`} type="number" step="0.01" value={rule.brokenPenaltyPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, brokenPenaltyPct: Number(e.target.value) } : r)))} /></td>
                      <td className={tdCls}><input type="checkbox" checked={rule.isActive} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: e.target.checked } : r)))} /></td>
                      <td className={tdCls}><input type="checkbox" checked={rule.requiresSerialNumber} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, requiresSerialNumber: e.target.checked } : r)))} /></td>
                      <td className={tdCls}>
                        <div className="flex gap-1.5">
                          <button className={primaryBtnCls} onClick={() => void saveRule(rule)}><IconSave /> Kaydet</button>
                          <button className={iconBtnCls} title="Sil" onClick={() => void deleteRule(rule.id)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>}

      {buybackOpsEnabled && activePanel === "ops" && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-slate-900">4) Bildirim ve ERP Import</h3>
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <h4 className="text-sm font-bold text-slate-900">Bildirim Kuyrugu</h4>
          <button className={`${primaryBtnCls} mt-2.5`} onClick={() => void processNotificationQueue()}>Kuyrugu Isle</button>
        </div>

        {erpSyncEnabled && <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <h4 className="text-sm font-bold text-slate-900">ERP Sync (JSON)</h4>
          <textarea className={`${inputCls} mt-2.5 font-mono`} rows={8} value={erpJson} onChange={(e) => setErpJson(e.target.value)} />
          <button className={`${primaryBtnCls} mt-2.5`} onClick={() => void runErpSync()}>ERP Sync Calistir</button>
        </div>}

        {erpSyncEnabled && <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <h4 className="text-sm font-bold text-slate-900">CSV Import (Pricing Rules)</h4>
          <div className="mt-2.5 mb-2.5 flex flex-wrap items-center gap-2.5">
            <input
              className={`${inputCls} max-w-[360px]`}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void handleCsvFileChange(e.target.files?.[0] ?? null)}
            />
            {csvFileName ? <span className="text-[13px] text-slate-500">Yuklenen dosya: {csvFileName}</span> : null}
          </div>
          <textarea className={`${inputCls} font-mono`} rows={6} value={csvData} onChange={(e) => setCsvData(e.target.value)} />
          <button className={`${primaryBtnCls} mt-2.5`} onClick={() => void runCsvImport()}>CSV Import Calistir</button>
        </div>}
      </div>}

      {buybackOpsEnabled && activePanel === "pdf" && <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-slate-900">5) PDF Ayarlari ve Fiyat Kural Gecmisi</h3>
        <div className="mt-3.5 mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
          <input className={inputCls} placeholder="Template1 Bayi" value={pdfSettings.template1DealerName} onChange={(e) => setPdfSettings((p) => ({ ...p, template1DealerName: e.target.value }))} />
          <input className={inputCls} placeholder="Template1 Is Ortagi" value={pdfSettings.template1PartnerName} onChange={(e) => setPdfSettings((p) => ({ ...p, template1PartnerName: e.target.value }))} />
          <input className={inputCls} placeholder="Template2 Ticari Unvan" value={pdfSettings.template2CompanyTradeName} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyTradeName: e.target.value }))} />
          <input className={inputCls} placeholder="Template2 Vergi/VKN" value={pdfSettings.template2CompanyTaxInfo} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyTaxInfo: e.target.value }))} />
          <input className={inputCls} placeholder="Template2 Telefon" value={pdfSettings.template2CompanyPhone} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyPhone: e.target.value }))} />
          <input className={inputCls} placeholder="Template2 Malzeme Cinsi" value={pdfSettings.template2MaterialType} onChange={(e) => setPdfSettings((p) => ({ ...p, template2MaterialType: e.target.value }))} />
          <input className={inputCls} placeholder="Template2 Adres" value={pdfSettings.template2CompanyAddress} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyAddress: e.target.value }))} />
          <button className={primaryBtnCls} onClick={() => void savePdfSettings()}>PDF Ayarlarini Kaydet</button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={thCls}>Tarih</th>
                  <th className={thCls}>Islem</th>
                  <th className={thCls}>Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pricingLogs.length === 0 ? (
                  <tr><td className={tdCls} colSpan={3}>Henuz fiyat kural gecmisi yok.</td></tr>
                ) : pricingLogs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-blue-50/30">
                    <td className={tdCls}>{new Date(log.createdAt).toLocaleString("tr-TR")}</td>
                    <td className={tdCls}>{log.action}</td>
                    <td className={tdCls}>{log.detail ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>}
      {buybackOpsEnabled && activePanel === "opspro" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Buyback Operasyon Pro</h3>
              <p className="mt-1 text-[13px] text-slate-500">Gonderdigin referans ekranlara yakin yonetim gorunumu</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className={secondaryBtnCls} href="/buyback/backoffice">
                Backoffice Ac <IconExternal />
              </Link>
              <button className={secondaryBtnCls} onClick={exportPoolCsv}><IconDownload /> Excele Aktar</button>
              <button className={primaryBtnCls} onClick={() => void refreshDeals()}><IconRefresh /> Yenile</button>
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Toplam Buyback" value={deals.length} />
            <StatCard label="Bekleyen Islem" value={deals.filter((d) => d.status === "DRAFT").length} />
            <StatCard label="Toplam Teklif (TL)" value={Math.round(deals.reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
            <StatCard label="Bugun Toplam Teklif (TL)" value={Math.round(deals.filter((d) => d.createdAt && new Date(d.createdAt).toDateString() === new Date().toDateString()).reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
          </div>

          <div className="mb-3.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
              <input className={inputCls} placeholder="Genel arama: ID, musteri, cihaz, seri no..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
              <select className={inputCls} value={poolStatus} onChange={(e) => setPoolStatus(e.target.value as "ALL" | BuybackDeal["status"])}>
                <option value="ALL">Tum Durumlar</option>
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <button className={secondaryBtnCls} onClick={() => { setPoolSearch(""); setPoolStatus("ALL"); }}>Temizle</button>
              <button className={primaryBtnCls} onClick={runBulkStatusUpdate}>Toplu Guncelle</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Buyback ID</th>
                    <th className={thCls}>Tarih</th>
                    <th className={thCls}>Musteri</th>
                    <th className={thCls}>Cihaz</th>
                    <th className={thCls}>Seri No</th>
                    <th className={thCls}>Durum</th>
                    <th className={thCls}>Teklif</th>
                    <th className={thCls}>PDF</th>
                    <th className={thCls}>Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.map((item, idx) => (
                    <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                      <td className={`${tdCls} font-mono`}>{idx + 1}</td>
                      <td className={`${tdCls} font-mono`}>{item.id.slice(-8)}</td>
                      <td className={tdCls}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
                      <td className={tdCls}>{item.customer?.fullName ?? "-"}</td>
                      <td className={tdCls}>{item.device ? `${item.device.brand} ${item.device.model}` : "-"}</td>
                      <td className={`${tdCls} font-mono`}>{item.device?.imei ?? "-"}</td>
                      <td className={tdCls}><StatusBadge status={item.status} /></td>
                      <td className={`${tdCls} font-mono font-bold text-slate-900`}>{Number(item.offeredPrice).toLocaleString("tr-TR")} TL</td>
                      <td className={tdCls}>
                        <div className="flex gap-1.5">
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 1)}>P1</button>
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 2)}>P2</button>
                          <button className={pdfBtnCls} onClick={() => openDealPdf(item.id, 3)}>P3</button>
                        </div>
                      </td>
                      <td className={tdCls}><button className={iconBtnCls} title="Detay" onClick={() => void openDetail(item)}><IconEye /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <p className="text-[13px] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

function statusLabel(status: BuybackDeal["status"]) {
  if (status === "DRAFT") return "Mutabakat Bekliyor";
  if (status === "APPROVED") return "Onayli";
  if (status === "REJECTED") return "Reddedildi";
  return "Tamamlandi";
}

function StatusBadge({ status }: { status: BuybackDeal["status"] }) {
  const map: Record<BuybackDeal["status"], string> = {
    DRAFT: "bg-amber-50 text-amber-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-rose-50 text-rose-700",
    COMPLETED: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${map[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.map((line, idx) => <p key={`${title}-${idx}`} className="text-[13px] text-slate-600">{line}</p>)}
      </div>
    </div>
  );
}

function StepOne({
  data,
  setData,
  selectedDeviceType,
  onDeviceTypeChange,
  brandOptions,
  modelOptions,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  selectedDeviceType: "telefon" | "macbook" | "tablet" | "watch";
  onDeviceTypeChange: (type: "telefon" | "macbook" | "tablet" | "watch") => void;
  brandOptions: string[];
  modelOptions: string[];
}) {
  return <div className="space-y-3">
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-[13px] text-slate-500">Cihaz Turu</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["telefon", "macbook", "tablet", "watch"] as const).map((type) => {
          const active = selectedDeviceType === type;
          const disabled = type !== "telefon";
          return (
            <button
              key={type}
              disabled={disabled}
              onClick={() => onDeviceTypeChange(type)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"} ${disabled ? "cursor-not-allowed opacity-55" : "hover:border-blue-300"}`}
            >
              {type.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
    <Field label="Marka">
      <select className={inputCls} value={data.brand} onChange={(e) => setData((p) => ({ ...p, brand: e.target.value, model: "" }))}>
        {brandOptions.length === 0 ? <option>Marka secin</option> : brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
      </select>
    </Field>
    <Field label="Model">
      <select className={inputCls} value={data.model} onChange={(e) => setData((p) => ({ ...p, model: e.target.value }))}>
        <option value="">Model secin</option>
        {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
    </Field>
  </div>;
}

function StepTwo({ questions, answers, setAnswer }: { questions: CatalogQuestion[]; answers: Record<string, number>; setAnswer: (label: string, value: number) => void }) {
  if (questions.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Bu model icin soru kirilimi bulunamadi. Sonraki adimdan iletisime gecebilirsiniz.</div>;
  }
  return <div className="space-y-3">
    {questions.map((q) => (
      <div key={q.label} className="rounded-xl border border-slate-200 bg-white p-3.5">
        <p className="mb-2 text-[15px] font-bold text-slate-900">{q.label} <span className="text-rose-500">*</span></p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {q.options.map((opt, idx) => {
            const selected = answers[q.label] === opt.value;
            return (
              <label
                key={`${q.label}-${opt.text}`}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{String.fromCharCode(65 + idx)}</span>
                  <span className="text-sm text-slate-700">{opt.text}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-500">{opt.value.toLocaleString("tr-TR")} TL</span>
                  <input type="radio" name={q.label} checked={selected} onChange={() => setAnswer(q.label, opt.value)} />
                </span>
              </label>
            );
          })}
        </div>
      </div>
    ))}
  </div>;
}

function StepThree({
  data,
  setData,
  autoFillCustomer,
  loadingCustomer,
  offeredPrice,
  submitting,
  contact,
  setContact,
  imageFiles,
  setImageFiles,
  products,
  tradeInEnabled,
  setTradeInEnabled,
  tradeInProductId,
  setTradeInProductId,
  tradeInPaymentMethod,
  setTradeInPaymentMethod,
  tradeInQuote,
  onSubmit,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  autoFillCustomer: () => void;
  loadingCustomer: boolean;
  offeredPrice: number;
  submitting: boolean;
  contact: ContactForm;
  setContact: React.Dispatch<React.SetStateAction<ContactForm>>;
  imageFiles: Record<ImageSlotKey, string>;
  setImageFiles: React.Dispatch<React.SetStateAction<Record<ImageSlotKey, string>>>;
  products: ProductOption[];
  tradeInEnabled: boolean;
  setTradeInEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  tradeInProductId: string;
  setTradeInProductId: React.Dispatch<React.SetStateAction<string>>;
  tradeInPaymentMethod: "CASH" | "CREDIT_CARD" | "ON_ACCOUNT";
  setTradeInPaymentMethod: React.Dispatch<React.SetStateAction<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">>;
  tradeInQuote: { grossAmount: number; differenceAmount: number; buybackCredit: number } | null;
  onSubmit: () => void;
}) {
  const imeiRequired = data.requiresSerialNumber !== false;
  const requiredMissing = !contact.firstName.trim() || !contact.lastName.trim() || !data.phone.trim() || !contact.email.trim() || !data.nationalId.trim() || (imeiRequired && !data.imei.trim()) || !contact.consentChecked;
  const imageLabels: Array<{ key: ImageSlotKey; title: string }> = [
    { key: "front", title: "On Goruntu" },
    { key: "back", title: "Arka Goruntu" },
    { key: "top", title: "Ust Kenar" },
    { key: "bottom", title: "Alt Kenar" },
  ];

  return <div className="space-y-3.5">
    <h4 className="text-sm font-bold text-slate-900">Iletisim ve Evrak Bilgileri</h4>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Ad *"><input className={inputCls} value={contact.firstName} onChange={(e) => { const v = e.target.value; setContact((p) => ({ ...p, firstName: v })); setData((p) => ({ ...p, fullName: `${v} ${contact.lastName}`.trim() })); }} /></Field>
      <Field label="Soyad *"><input className={inputCls} value={contact.lastName} onChange={(e) => { const v = e.target.value; setContact((p) => ({ ...p, lastName: v })); setData((p) => ({ ...p, fullName: `${contact.firstName} ${v}`.trim() })); }} /></Field>
      <Field label="Telefon *"><input className={inputCls} value={data.phone} onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))} /></Field>
      <Field label="E-posta *"><input className={inputCls} type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></Field>
      <Field label="T.C. Kimlik No *"><input className={`${inputCls} font-mono`} value={data.nationalId} maxLength={11} onBlur={autoFillCustomer} onChange={(e) => setData((p) => ({ ...p, nationalId: e.target.value.replace(/\D/g, "") }))} /></Field>
      <Field label={imeiRequired ? "IMEI *" : "IMEI (opsiyonel)"}><input className={`${inputCls} font-mono`} value={data.imei} onChange={(e) => setData((p) => ({ ...p, imei: e.target.value.replace(/\D/g, "") }))} /></Field>
      <Field label="Sehir"><input className={inputCls} value={contact.city} onChange={(e) => setContact((p) => ({ ...p, city: e.target.value }))} /></Field>
      <Field label="Ilce"><input className={inputCls} value={contact.district} onChange={(e) => setContact((p) => ({ ...p, district: e.target.value }))} /></Field>
      <Field label="IBAN"><input className={`${inputCls} font-mono`} value={contact.iban} onChange={(e) => setContact((p) => ({ ...p, iban: e.target.value.toUpperCase() }))} /></Field>
      <Field label="IBAN Hesap Sahibi"><input className={inputCls} value={contact.ibanHolder} onChange={(e) => setContact((p) => ({ ...p, ibanHolder: e.target.value }))} /></Field>
    </div>
    <Field label="Adres"><textarea className={inputCls} rows={3} value={contact.address} onChange={(e) => setContact((p) => ({ ...p, address: e.target.value }))} /></Field>
    {loadingCustomer && <p className="text-sm text-slate-500">Musteri kontrol ediliyor...</p>}
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {imageLabels.map((slot) => (
        <div key={slot.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-900">{slot.title}</p>
          <p className="mt-0.5 mb-2 text-xs text-slate-500">JPG/PNG - Maks 5 MB</p>
          <input className={inputCls} type="file" accept="image/png,image/jpeg" onChange={(e) => setImageFiles((prev) => ({ ...prev, [slot.key]: e.target.files?.[0]?.name ?? "" }))} />
          <p className="mt-1.5 truncate text-xs text-slate-500">{imageFiles[slot.key] || "Dosya secilmedi"}</p>
        </div>
      ))}
    </div>
    <label className="flex items-center gap-2 text-[13px] text-slate-600">
      <input type="checkbox" checked={contact.consentChecked} onChange={(e) => setContact((p) => ({ ...p, consentChecked: e.target.checked }))} />
      Onay kutularini okudum, teklifin gonderilmesini kabul ediyorum.
    </label>
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <label className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
        <input type="checkbox" checked={tradeInEnabled} onChange={(e) => setTradeInEnabled(e.target.checked)} />
        Takas islemi yap (eski cihaz kredi + yeni cihaz satis)
      </label>
      {tradeInEnabled && (
        <div className="space-y-2.5">
          <Field label="Yeni alinacak urun">
            <select className={inputCls} value={tradeInProductId} onChange={(e) => setTradeInProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {p.salePrice.toLocaleString("tr-TR")} TL</option>
              ))}
            </select>
          </Field>
          <Field label="Fark odeme tipi">
            <select className={inputCls} value={tradeInPaymentMethod} onChange={(e) => setTradeInPaymentMethod(e.target.value as "CASH" | "CREDIT_CARD" | "ON_ACCOUNT")}>
              <option value="CASH">Nakit</option>
              <option value="CREDIT_CARD">Kredi Karti</option>
              <option value="ON_ACCOUNT">Veresiye</option>
            </select>
          </Field>
          {tradeInQuote && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Yeni Cihaz: <strong className="font-mono text-slate-900">{tradeInQuote.grossAmount.toLocaleString("tr-TR")} TL</strong></p>
              <p className="mt-1 text-sm text-slate-600">Buyback Kredisi: <strong className="font-mono text-slate-900">{tradeInQuote.buybackCredit.toLocaleString("tr-TR")} TL</strong></p>
              <p className="mt-1 text-sm font-bold text-slate-900">Odenecek Fark: <span className="font-mono">{tradeInQuote.differenceAmount.toLocaleString("tr-TR")} TL</span></p>
            </div>
          )}
        </div>
      )}
    </div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <p className="text-[13px] text-slate-500">Tahmini Teklif</p>
      <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{offeredPrice.toLocaleString("tr-TR")} TL</p>
    </div>
    <button onClick={onSubmit} disabled={submitting || requiredMissing} className={`${primaryBtnCls} w-full py-3`}>{submitting ? "Kaydediliyor..." : "Teklifi Onayla ve Cihazi Stoga Ekle"}</button>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-[13px] text-slate-500">{label}</span>{children}</label>;
}
