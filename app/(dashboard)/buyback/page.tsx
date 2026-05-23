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
};

function inferStorageFromModel(model: string) {
  const match = model.match(/(\d+\s?(GB|TB))/i);
  return match ? match[1].toUpperCase().replace(/\s+/g, "") : "MODEL_ICINDE";
}

const steps = ["CIHAZ", "CIHAZ DURUMU", "ILETISIM VE ONAY"];

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

  return (
    <section className="stack-grid">
      <h2 className="page-title">Buyback Surec ve Operasyon Merkezi</h2>
      {!buybackOpsEnabled && <div className="empty-box">Buyback yeni operasyon modulu su an pasif.</div>}
      {buybackOpsEnabled && (
        <div className="panel" style={{ padding: "0.65rem" }}>
          <div className="toolbar-wrap">
            <button className={`field`} style={{ width: 170, background: activePanel === "opspro" ? "#0f766e" : "#fff", color: activePanel === "opspro" ? "#fff" : "#0f172a", borderColor: activePanel === "opspro" ? "#0f766e" : "var(--border)" }} onClick={() => setActivePanel("opspro")}>Operasyon Pro</button>
            <button className={`field`} style={{ width: 170, background: activePanel === "pool" ? "#e6fffb" : "#fff" }} onClick={() => setActivePanel("pool")}>Teklif Havuzu</button>
            <button className={`field`} style={{ width: 170, background: activePanel === "wizard" ? "#e6fffb" : "#fff" }} onClick={() => setActivePanel("wizard")}>Sihirbaz</button>
            <button className={`field`} style={{ width: 170, background: activePanel === "pricing" ? "#e6fffb" : "#fff" }} onClick={() => setActivePanel("pricing")}>Fiyat Motoru</button>
            <button className={`field`} style={{ width: 170, background: activePanel === "ops" ? "#e6fffb" : "#fff" }} onClick={() => setActivePanel("ops")}>Bildirim/ERP</button>
            <button className={`field`} style={{ width: 170, background: activePanel === "pdf" ? "#e6fffb" : "#fff" }} onClick={() => setActivePanel("pdf")}>PDF/Gecmis</button>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <StatCard label="Toplam Teklif" value={stats.total} />
        <StatCard label="Taslak" value={stats.draft} />
        <StatCard label="Onayli" value={stats.approved} />
        <StatCard label="Tamamlanan" value={stats.completed} />
      </div>
      <div className="panel" style={{ padding: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>Operasyon Kontrol Merkezi</h3>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Buyback, takas, PDF, ERP ve kuyruk sureclerinin tek ekrandan yonetim ozeti</p>
          </div>
          <button className="field" style={{ width: 140 }} onClick={() => setShowControlCenter((v) => !v)}>{showControlCenter ? "Daralt" : "Genislet"}</button>
        </div>
        {showControlCenter && (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <div className="form-grid-4">
              <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Toplam Teklif Hacmi</p>
                <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800 }}>{Math.round(controlRows.totalOffer).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Final Bedel Toplami</p>
                <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800 }}>{Math.round(controlRows.totalFinal).toLocaleString("tr-TR")} TL</p>
              </div>
              <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Onay Orani</p>
                <p style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 800 }}>%{controlRows.approvalRate}</p>
              </div>
              <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Modul Durumu</p>
                <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700 }}>Buyback {buybackOpsEnabled ? "AKTIF" : "PASIF"} / ERP {erpSyncEnabled ? "AKTIF" : "PASIF"}</p>
              </div>
            </div>
            <div className="form-grid-4">
              <button className="primary-btn" onClick={() => setActivePanel("wizard")}>Sihirbaz Operasyonu</button>
              <button className="primary-btn" onClick={() => setActivePanel("pool")}>Havuz ve Detay Yonetimi</button>
              <button className="primary-btn" onClick={() => setActivePanel("ops")}>Kuyruk / ERP Merkezi</button>
              <button className="primary-btn" onClick={() => setActivePanel("pdf")}>PDF ve Gecmis Merkezi</button>
            </div>
            <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Canli Gelisim Kapsami</p>
              <div style={{ marginTop: 6, color: "#334155", fontSize: 13, display: "grid", gap: 4 }}>
                <span>• CSV telefon importu + soru kirilim katalogu</span>
                <span>• Dinamik sihirbaz (soru zorunlulugu + teklif karti)</span>
                <span>• Buyback + takas quote/checkout akisi</span>
                <span>• P1/P2/P3 PDF uretimi ve dokuman erisimi</span>
                <span>• Detay modal: belgeler + soru/cevap + operasyon ozeti</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {buybackOpsEnabled && activePanel === "wizard" && <div className="panel" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>1) Buyback Sihirbazi</h3>
        <div className="wizard-steps-grid" style={{ marginBottom: 14 }}>
          {steps.map((s, idx) => {
            const active = step === idx + 1;
            return <div key={s} className="panel" style={{ padding: "0.5rem", textAlign: "center", background: active ? "#0f766e" : "#fff", color: active ? "#fff" : "#334155", borderColor: active ? "#0f766e" : "var(--border)" }}>{idx + 1}. {s}</div>;
          })}
        </div>

        <div className="panel" style={{ padding: "1rem", background: "#fff" }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0,1fr) minmax(250px,320px)" }}>
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
            <aside className="panel" style={{ padding: "0.9rem", background: "linear-gradient(135deg,#0b1f4b,#1d3f8f)", color: "#fff", alignSelf: "start" }}>
              <p style={{ margin: 0, fontSize: 12, letterSpacing: 0.4, opacity: 0.9 }}>TAHMINI TEKLIF</p>
              <p style={{ margin: "8px 0 10px", fontSize: 38, fontWeight: 900 }}>{offeredPrice.toLocaleString("tr-TR")} TL</p>
              <p style={{ margin: 0, opacity: 0.9, fontSize: 12 }}>Secimlere gore anlik hesaplanir.</p>
              {step === 2 && missingQuestionCount > 0 ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#bfdbfe" }}>{missingQuestionCount} soru daha cevaplanmali.</p>
              ) : null}
            </aside>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button className="field" style={{ width: 120 }} disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>Geri</button>
            {step < 3 && <button
              className="primary-btn"
              disabled={step === 2 && modelQuestions.length > 0 && missingQuestionCount > 0}
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              {step === 1 ? "Sorulara Gec" : "Iletisim ve Onay"}
            </button>}
          </div>
        </div>
      </div>}

      {buybackOpsEnabled && activePanel === "pool" && <div className="panel" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>2) Teklif Operasyon Havuzu</h3>
        <div className="stats-grid" style={{ marginBottom: 10 }}>
          <StatCard label="Toplam Buyback" value={deals.length} />
          <StatCard label="Bekleyen Islem" value={deals.filter((d) => d.status === "DRAFT").length} />
          <StatCard label="Toplam Teklif (TL)" value={Math.round(deals.reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
          <StatCard label="Bugun Islem" value={deals.filter((d) => d.createdAt && new Date(d.createdAt).toDateString() === new Date().toDateString()).length} />
        </div>
        <div className="panel" style={{ padding: "0.75rem", marginBottom: 10 }}>
          <div className="form-grid-4">
            <input className="field" placeholder="Buyback ID, musteri, seri no..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
            <select className="field" value={poolStatus} onChange={(e) => setPoolStatus(e.target.value as "ALL" | BuybackDeal["status"])}>
              <option value="ALL">Tum Durumlar</option>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <button className="field" onClick={() => { setPoolSearch(""); setPoolStatus("ALL"); }}>Temizle</button>
            <button className="primary-btn" onClick={exportPoolCsv}>Excele Aktar</button>
          </div>
        </div>
        <div className="toolbar-wrap" style={{ marginBottom: 10 }}>
          <select className="field" style={{ maxWidth: 220 }} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as BuybackDeal["status"])}>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          <button className="primary-btn" onClick={runBulkStatusUpdate}>Secilenleri Guncelle</button>
          <button className="field" style={{ width: 180 }} onClick={() => void refreshDeals()}>Listeyi Yenile</button>
        </div>

        <div className="panel panel-scroll">
          {loadingDeals ? (
            <div className="empty-box">Teklifler yukleniyor...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="empty-box">Henuz ikinci el teklifi yok.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === deals.length} onChange={(e) => setSelectedIds(e.target.checked ? deals.map((d) => d.id) : [])} /></th>
                  <th>Musteri</th>
                  <th>Cihaz</th>
                  <th>Teklif</th>
                  <th>Anlasilan</th>
                  <th>Durum</th>
                  <th>Not</th>
                  <th>PDF</th>
                  <th>Kaydet</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                        }
                      />
                    </td>
                    <td>{item.customer?.fullName ?? "-"}</td>
                    <td>{item.device ? `${item.device.brand} ${item.device.model}` : "-"}</td>
                    <td>{Number(item.offeredPrice).toFixed(2)} TL</td>
                    <td>
                      <input
                        className="field"
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
                    <td>
                      <select
                        className="field"
                        value={item.status}
                        onChange={(e) => setDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, status: e.target.value as BuybackDeal["status"] } : d)))}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="field"
                        value={item.evaluationNote ?? ""}
                        onChange={(e) => setDeals((prev) => prev.map((d) => (d.id === item.id ? { ...d, evaluationNote: e.target.value } : d)))}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="field" style={{ width: 52 }} onClick={() => openDealPdf(item.id, 1)}>P1</button>
                        <button className="field" style={{ width: 52 }} onClick={() => openDealPdf(item.id, 2)}>P2</button>
                        <button className="field" style={{ width: 52 }} onClick={() => openDealPdf(item.id, 3)}>P3</button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="field" style={{ width: 74 }} onClick={() => void openDetail(item)}>Detay</button>
                        <button className="primary-btn" onClick={() => void saveDeal(item)}>Kaydet</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>}
      {detailDeal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, padding: "4vh 2vw", overflow: "auto" }}>
          <div className="panel" style={{ width: "min(1300px,96vw)", margin: "0 auto", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0 }}>Buyback ID: {detailDeal.id}</h3>
                <StatusBadge status={detailDeal.status} />
              </div>
              <button className="field" style={{ width: 120 }} onClick={() => setDetailDeal(null)}>Kapat</button>
            </div>
            <div className="toolbar-wrap" style={{ marginTop: 10 }}>
              <button className="field" style={{ width: 150, background: detailTab === "documents" ? "#e6fffb" : "#fff" }} onClick={() => setDetailTab("documents")}>Belgeler</button>
              <button className="field" style={{ width: 170, background: detailTab === "qa" ? "#e6fffb" : "#fff" }} onClick={() => setDetailTab("qa")}>Sorular ve Cevaplar</button>
            </div>
            <div className="panel" style={{ marginTop: 10, padding: "0.9rem" }}>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
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
            </div>
            {detailLoading && <div className="empty-box" style={{ marginTop: 10 }}>Detay yukleniyor...</div>}
            {detailTab === "documents" ? (
              <div className="panel" style={{ marginTop: 10, padding: "0.9rem" }}>
                <h4 style={{ marginTop: 0 }}>PDFler</h4>
                <div className="toolbar-wrap">
                  <button className="field" style={{ width: 160 }} onClick={() => openDealPdf(detailDeal.id, 1)}>Sozlesme (P1)</button>
                  <button className="field" style={{ width: 160 }} onClick={() => openDealPdf(detailDeal.id, 2)}>Ozet (P2)</button>
                  <button className="field" style={{ width: 190 }} onClick={() => openDealPdf(detailDeal.id, 3)}>Alim Satim Belgesi (P3)</button>
                </div>
                <h4 style={{ marginTop: 14 }}>Gorseller</h4>
                <div className="form-grid-4">
                  {parseImageCards(detailData?.customer?.notes).length === 0 ? (
                    <div className="empty-box">Kayitli gorsel metadata bulunamadi.</div>
                  ) : parseImageCards(detailData?.customer?.notes).map((img, idx) => (
                    <div key={`${img.slot}-${idx}`} className="panel" style={{ padding: "0.7rem", textAlign: "center" }}>
                      <div style={{ width: 52, height: 52, margin: "0 auto 8px", borderRadius: 8, background: "#e2e8f0", display: "grid", placeItems: "center", color: "#475569", fontSize: 11 }}>IMG</div>
                      <div style={{ fontWeight: 700 }}>{img.slot}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{img.file}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="panel" style={{ marginTop: 10, padding: "0.9rem" }}>
                <h4 style={{ marginTop: 0 }}>Soru/Cevap Ozeti</h4>
                <p style={{ margin: 0, color: "#475569" }}>{detailData?.device?.conditionNote || detailDeal.evaluationNote || "Bu kayit icin soru/cevap notu bulunmuyor."}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {buybackOpsEnabled && activePanel === "pricing" && <div className="panel" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>3) Fiyat Motoru Kurallari</h3>
        {simulationBreakdown && (
          <div className="panel" style={{ padding: "0.75rem", marginBottom: "0.75rem", background: "#f8fafc" }}>
            <h4 style={{ marginTop: 0 }}>Teklif Simulasyonu</h4>
            <p style={{ margin: "4px 0" }}>Baz Fiyat: {simulationBreakdown.basePrice.toLocaleString("tr-TR")} TL</p>
            {simulationBreakdown.lines.map((line, idx) => (
              <p key={`${line.note}-${idx}`} style={{ margin: "4px 0", color: "#475569" }}>
                {line.note} x{line.multiplier.toFixed(2)}
              </p>
            ))}
            <p style={{ margin: "8px 0 0", fontWeight: 800 }}>Toplam Teklif: {simulationBreakdown.offeredPrice.toLocaleString("tr-TR")} TL</p>
          </div>
        )}

        <div className="panel" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
          <h4 style={{ marginTop: 0 }}>Yeni Kural Ekle</h4>
          <div className="form-grid-4">
            <input className="field" placeholder="Marka" value={ruleForm.brand} onChange={(e) => setRuleForm((p) => ({ ...p, brand: e.target.value }))} />
            <input className="field" placeholder="Model Pattern (ops.)" value={ruleForm.modelPattern} onChange={(e) => setRuleForm((p) => ({ ...p, modelPattern: e.target.value }))} />
            <input className="field" type="number" placeholder="Base Price" value={ruleForm.basePrice} onChange={(e) => setRuleForm((p) => ({ ...p, basePrice: Number(e.target.value) }))} />
            <button className="primary-btn" disabled={creatingRule} onClick={() => void createRule()}>{creatingRule ? "Olusturuluyor..." : "Kural Ekle"}</button>
          </div>
        </div>

        <div className="panel panel-scroll">
          {loadingRules ? (
            <div className="empty-box">Kurallar yukleniyor...</div>
          ) : rules.length === 0 ? (
            <div className="empty-box">Henuz fiyat kurali yok.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Marka</th>
                  <th>Model</th>
                  <th>Base</th>
                  <th>Excellent</th>
                  <th>Good</th>
                  <th>Bad</th>
                  <th>Pil+</th>
                  <th>Pil-</th>
                  <th>Ariza-</th>
                  <th>Aktif</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><input className="field" value={rule.brand} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, brand: e.target.value } : r)))} /></td>
                    <td><input className="field" value={rule.modelPattern ?? ""} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, modelPattern: e.target.value } : r)))} /></td>
                    <td><input className="field" type="number" value={rule.basePrice} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, basePrice: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.excellentBonusPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, excellentBonusPct: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.goodBonusPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, goodBonusPct: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.badPenaltyPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, badPenaltyPct: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.batteryHighPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, batteryHighPct: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.batteryLowPenalty} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, batteryLowPenalty: Number(e.target.value) } : r)))} /></td>
                    <td><input className="field" type="number" step="0.01" value={rule.brokenPenaltyPct} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, brokenPenaltyPct: Number(e.target.value) } : r)))} /></td>
                    <td><input type="checkbox" checked={rule.isActive} onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: e.target.checked } : r)))} /></td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <button className="primary-btn" onClick={() => void saveRule(rule)}>Kaydet</button>
                      <button className="field" style={{ width: 90 }} onClick={() => void deleteRule(rule.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>}

      {buybackOpsEnabled && activePanel === "ops" && <div className="panel" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>4) Bildirim ve ERP Import</h3>
        <div className="panel" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
          <h4 style={{ marginTop: 0 }}>Bildirim Kuyrugu</h4>
          <button className="primary-btn" onClick={() => void processNotificationQueue()}>Kuyrugu Isle</button>
        </div>

        {erpSyncEnabled && <div className="panel" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
          <h4 style={{ marginTop: 0 }}>ERP Sync (JSON)</h4>
          <textarea className="field" rows={8} value={erpJson} onChange={(e) => setErpJson(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            <button className="primary-btn" onClick={() => void runErpSync()}>ERP Sync Calistir</button>
          </div>
        </div>}

        {erpSyncEnabled && <div className="panel" style={{ padding: "0.75rem" }}>
          <h4 style={{ marginTop: 0 }}>CSV Import (Pricing Rules)</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              className="field"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void handleCsvFileChange(e.target.files?.[0] ?? null)}
              style={{ maxWidth: 360 }}
            />
            {csvFileName ? <span style={{ color: "#64748b", fontSize: 13 }}>Yuklenen dosya: {csvFileName}</span> : null}
          </div>
          <textarea className="field" rows={6} value={csvData} onChange={(e) => setCsvData(e.target.value)} />
          <div style={{ marginTop: 8 }}>
            <button className="primary-btn" onClick={() => void runCsvImport()}>CSV Import Calistir</button>
          </div>
        </div>}
      </div>}

      {buybackOpsEnabled && activePanel === "pdf" && <div className="panel" style={{ padding: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>5) PDF Ayarlari ve Fiyat Kural Gecmisi</h3>
        <div className="form-grid-4" style={{ marginBottom: 12 }}>
          <input className="field" placeholder="Template1 Bayi" value={pdfSettings.template1DealerName} onChange={(e) => setPdfSettings((p) => ({ ...p, template1DealerName: e.target.value }))} />
          <input className="field" placeholder="Template1 Is Ortagi" value={pdfSettings.template1PartnerName} onChange={(e) => setPdfSettings((p) => ({ ...p, template1PartnerName: e.target.value }))} />
          <input className="field" placeholder="Template2 Ticari Unvan" value={pdfSettings.template2CompanyTradeName} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyTradeName: e.target.value }))} />
          <input className="field" placeholder="Template2 Vergi/VKN" value={pdfSettings.template2CompanyTaxInfo} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyTaxInfo: e.target.value }))} />
          <input className="field" placeholder="Template2 Telefon" value={pdfSettings.template2CompanyPhone} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyPhone: e.target.value }))} />
          <input className="field" placeholder="Template2 Malzeme Cinsi" value={pdfSettings.template2MaterialType} onChange={(e) => setPdfSettings((p) => ({ ...p, template2MaterialType: e.target.value }))} />
          <input className="field" placeholder="Template2 Adres" value={pdfSettings.template2CompanyAddress} onChange={(e) => setPdfSettings((p) => ({ ...p, template2CompanyAddress: e.target.value }))} />
          <button className="primary-btn" onClick={() => void savePdfSettings()}>PDF Ayarlarini Kaydet</button>
        </div>
        <div className="panel panel-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Islem</th>
                <th>Detay</th>
              </tr>
            </thead>
            <tbody>
              {pricingLogs.length === 0 ? (
                <tr><td colSpan={3}>Henuz fiyat kural gecmisi yok.</td></tr>
              ) : pricingLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString("tr-TR")}</td>
                  <td>{log.action}</td>
                  <td>{log.detail ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}
      {buybackOpsEnabled && activePanel === "opspro" && (
        <div className="panel" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>Buyback Operasyon Pro</h3>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Gonderdigin referans ekranlara yakin yonetim gorunumu</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link className="primary-btn" href="/buyback/backoffice">Backoffice Ac</Link>
              <button className="field" style={{ width: 130 }} onClick={exportPoolCsv}>Excele Aktar</button>
              <button className="primary-btn" style={{ width: 110 }} onClick={() => void refreshDeals()}>Yenile</button>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 10 }}>
            <StatCard label="Toplam Buyback" value={deals.length} />
            <StatCard label="Bekleyen Islem" value={deals.filter((d) => d.status === "DRAFT").length} />
            <StatCard label="Toplam Teklif (TL)" value={Math.round(deals.reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
            <StatCard label="Bugun Toplam Teklif (TL)" value={Math.round(deals.filter((d) => d.createdAt && new Date(d.createdAt).toDateString() === new Date().toDateString()).reduce((s, d) => s + Number(d.offeredPrice || 0), 0))} />
          </div>

          <div className="panel" style={{ padding: "0.75rem", marginBottom: 10 }}>
            <div className="form-grid-4">
              <input className="field" placeholder="Genel arama: ID, musteri, cihaz, seri no..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
              <select className="field" value={poolStatus} onChange={(e) => setPoolStatus(e.target.value as "ALL" | BuybackDeal["status"])}>
                <option value="ALL">Tum Durumlar</option>
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <button className="field" onClick={() => { setPoolSearch(""); setPoolStatus("ALL"); }}>Temizle</button>
              <button className="primary-btn" onClick={runBulkStatusUpdate}>Toplu Guncelle</button>
            </div>
          </div>

          <div className="panel panel-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Buyback ID</th>
                  <th>Tarih</th>
                  <th>Musteri</th>
                  <th>Cihaz</th>
                  <th>Seri No</th>
                  <th>Durum</th>
                  <th>Teklif</th>
                  <th>PDF</th>
                  <th>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.id.slice(-8)}</td>
                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("tr-TR") : "-"}</td>
                    <td>{item.customer?.fullName ?? "-"}</td>
                    <td>{item.device ? `${item.device.brand} ${item.device.model}` : "-"}</td>
                    <td>{item.device?.imei ?? "-"}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td style={{ fontWeight: 700 }}>{Number(item.offeredPrice).toLocaleString("tr-TR")} TL</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="field" style={{ width: 48 }} onClick={() => openDealPdf(item.id, 1)}>P1</button>
                        <button className="field" style={{ width: 48 }} onClick={() => openDealPdf(item.id, 2)}>P2</button>
                        <button className="field" style={{ width: 48 }} onClick={() => openDealPdf(item.id, 3)}>P3</button>
                      </div>
                    </td>
                    <td><button className="primary-btn" style={{ width: 88 }} onClick={() => void openDetail(item)}>Detay</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel" style={{ padding: "0.75rem 0.9rem" }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800 }}>{value}</p>
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
  const map: Record<BuybackDeal["status"], { bg: string; color: string }> = {
    DRAFT: { bg: "#fef3c7", color: "#92400e" },
    APPROVED: { bg: "#dcfce7", color: "#166534" },
    REJECTED: { bg: "#fee2e2", color: "#991b1b" },
    COMPLETED: { bg: "#dbeafe", color: "#1e3a8a" },
  };
  const c = map[status];
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
      {statusLabel(status)}
    </span>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{title}</p>
      <div style={{ display: "grid", gap: 5 }}>
        {lines.map((line, idx) => <p key={`${title}-${idx}`} style={{ margin: 0, color: "#334155", fontSize: 13 }}>{line}</p>)}
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
  return <div style={{ display: "grid", gap: 10 }}>
    <div className="panel" style={{ padding: 10 }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>Cihaz Turu</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
        {(["telefon", "macbook", "tablet", "watch"] as const).map((type) => {
          const active = selectedDeviceType === type;
          const disabled = type !== "telefon";
          return (
            <button key={type} disabled={disabled} onClick={() => onDeviceTypeChange(type)} className="field" style={{ padding: "0.85rem", borderColor: active ? "#0f766e" : undefined, color: active ? "#0f766e" : undefined, opacity: disabled ? 0.55 : 1 }}>
              {type.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
    <Field label="Marka">
      <select className="field" value={data.brand} onChange={(e) => setData((p) => ({ ...p, brand: e.target.value, model: "" }))}>
        {brandOptions.length === 0 ? <option>Marka secin</option> : brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
      </select>
    </Field>
    <Field label="Model">
      <select className="field" value={data.model} onChange={(e) => setData((p) => ({ ...p, model: e.target.value }))}>
        <option value="">Model secin</option>
        {modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
    </Field>
  </div>;
}

function StepTwo({ questions, answers, setAnswer }: { questions: CatalogQuestion[]; answers: Record<string, number>; setAnswer: (label: string, value: number) => void }) {
  if (questions.length === 0) {
    return <div className="panel" style={{ padding: 12, color: "#64748b" }}>Bu model icin soru kirilimi bulunamadi. Sonraki adimdan iletisime gecebilirsiniz.</div>;
  }
  return <div style={{ display: "grid", gap: 12 }}>
    {questions.map((q) => (
      <div key={q.label} className="panel" style={{ padding: "0.9rem" }}>
        <p style={{ margin: "0 0 8px", fontSize: 16, color: "#0f172a", fontWeight: 700 }}>{q.label} <span style={{ color: "#ef4444" }}>*</span></p>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          {q.options.map((opt, idx) => (
            <label key={`${q.label}-${opt.text}`} className="panel" style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0.65rem", cursor: "pointer", borderColor: answers[q.label] === opt.value ? "#0f766e" : undefined, background: answers[q.label] === opt.value ? "#ecfdf5" : "#fff" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 99, background: "#e2e8f0", fontSize: 11, display: "grid", placeItems: "center", color: "#334155", fontWeight: 700 }}>{String.fromCharCode(65 + idx)}</span>
                {opt.text}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#64748b", fontSize: 12 }}>{opt.value.toLocaleString("tr-TR")} TL</span>
                <input type="radio" name={q.label} checked={answers[q.label] === opt.value} onChange={() => setAnswer(q.label, opt.value)} />
              </span>
            </label>
          ))}
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
  const requiredMissing = !contact.firstName.trim() || !contact.lastName.trim() || !data.phone.trim() || !contact.email.trim() || !data.nationalId.trim() || !data.imei.trim() || !contact.consentChecked;
  const imageLabels: Array<{ key: ImageSlotKey; title: string }> = [
    { key: "front", title: "On Goruntu" },
    { key: "back", title: "Arka Goruntu" },
    { key: "top", title: "Ust Kenar" },
    { key: "bottom", title: "Alt Kenar" },
  ];

  return <div style={{ display: "grid", gap: 12 }}>
    <h4 style={{ margin: 0 }}>Iletisim ve Evrak Bilgileri</h4>
    <div className="form-grid-2">
      <Field label="Ad *"><input className="field" value={contact.firstName} onChange={(e) => { const v = e.target.value; setContact((p) => ({ ...p, firstName: v })); setData((p) => ({ ...p, fullName: `${v} ${contact.lastName}`.trim() })); }} /></Field>
      <Field label="Soyad *"><input className="field" value={contact.lastName} onChange={(e) => { const v = e.target.value; setContact((p) => ({ ...p, lastName: v })); setData((p) => ({ ...p, fullName: `${contact.firstName} ${v}`.trim() })); }} /></Field>
      <Field label="Telefon *"><input className="field" value={data.phone} onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))} /></Field>
      <Field label="E-posta *"><input className="field" type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} /></Field>
      <Field label="T.C. Kimlik No *"><input className="field" value={data.nationalId} maxLength={11} onBlur={autoFillCustomer} onChange={(e) => setData((p) => ({ ...p, nationalId: e.target.value.replace(/\D/g, "") }))} /></Field>
      <Field label="IMEI *"><input className="field" value={data.imei} onChange={(e) => setData((p) => ({ ...p, imei: e.target.value.replace(/\D/g, "") }))} /></Field>
      <Field label="Sehir"><input className="field" value={contact.city} onChange={(e) => setContact((p) => ({ ...p, city: e.target.value }))} /></Field>
      <Field label="Ilce"><input className="field" value={contact.district} onChange={(e) => setContact((p) => ({ ...p, district: e.target.value }))} /></Field>
      <Field label="IBAN"><input className="field" value={contact.iban} onChange={(e) => setContact((p) => ({ ...p, iban: e.target.value.toUpperCase() }))} /></Field>
      <Field label="IBAN Hesap Sahibi"><input className="field" value={contact.ibanHolder} onChange={(e) => setContact((p) => ({ ...p, ibanHolder: e.target.value }))} /></Field>
    </div>
    <Field label="Adres"><textarea className="field" rows={3} value={contact.address} onChange={(e) => setContact((p) => ({ ...p, address: e.target.value }))} /></Field>
    {loadingCustomer && <p style={{ color: "#64748b", margin: 0 }}>Musteri kontrol ediliyor...</p>}
    <div className="form-grid-4">
      {imageLabels.map((slot) => (
        <div key={slot.key} className="panel" style={{ padding: "0.75rem" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{slot.title}</p>
          <p style={{ margin: "2px 0 8px", color: "#64748b", fontSize: 12 }}>JPG/PNG - Maks 5 MB</p>
          <input className="field" type="file" accept="image/png,image/jpeg" onChange={(e) => setImageFiles((prev) => ({ ...prev, [slot.key]: e.target.files?.[0]?.name ?? "" }))} />
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 12 }}>{imageFiles[slot.key] || "Dosya secilmedi"}</p>
        </div>
      ))}
    </div>
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      <input type="checkbox" checked={contact.consentChecked} onChange={(e) => setContact((p) => ({ ...p, consentChecked: e.target.checked }))} />
      Onay kutularini okudum, teklifin gonderilmesini kabul ediyorum.
    </label>
    <div className="panel" style={{ padding: "0.8rem" }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 10 }}>
        <input type="checkbox" checked={tradeInEnabled} onChange={(e) => setTradeInEnabled(e.target.checked)} />
        Takas islemi yap (eski cihaz kredi + yeni cihaz satis)
      </label>
      {tradeInEnabled && (
        <div style={{ display: "grid", gap: 8 }}>
          <Field label="Yeni alinacak urun">
            <select className="field" value={tradeInProductId} onChange={(e) => setTradeInProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} - {p.salePrice.toLocaleString("tr-TR")} TL</option>
              ))}
            </select>
          </Field>
          <Field label="Fark odeme tipi">
            <select className="field" value={tradeInPaymentMethod} onChange={(e) => setTradeInPaymentMethod(e.target.value as "CASH" | "CREDIT_CARD" | "ON_ACCOUNT")}>
              <option value="CASH">Nakit</option>
              <option value="CREDIT_CARD">Kredi Karti</option>
              <option value="ON_ACCOUNT">Veresiye</option>
            </select>
          </Field>
          {tradeInQuote && (
            <div className="panel" style={{ padding: "0.7rem", background: "#f8fafc" }}>
              <p style={{ margin: 0 }}>Yeni Cihaz: <strong>{tradeInQuote.grossAmount.toLocaleString("tr-TR")} TL</strong></p>
              <p style={{ margin: "4px 0 0" }}>Buyback Kredisi: <strong>{tradeInQuote.buybackCredit.toLocaleString("tr-TR")} TL</strong></p>
              <p style={{ margin: "4px 0 0", fontWeight: 700 }}>Odenecek Fark: {tradeInQuote.differenceAmount.toLocaleString("tr-TR")} TL</p>
            </div>
          )}
        </div>
      )}
    </div>
    <div className="panel" style={{ padding: 12, background: "#f8fafc" }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Tahmini Teklif</p>
      <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800 }}>{offeredPrice.toLocaleString("tr-TR")} TL</p>
    </div>
    <button onClick={onSubmit} disabled={submitting || requiredMissing} className="primary-btn">{submitting ? "Kaydediliyor..." : "Teklifi Onayla ve Cihazi Stoga Ekle"}</button>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>{children}</label>;
}
