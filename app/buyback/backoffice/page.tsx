"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Role = "PLATFORM_OWNER" | "ADMIN" | "MANAGER" | "CASHIER" | "TECHNICIAN" | "ACCOUNTANT";
type ModuleKey = "intake" | "queue" | "list" | "detail" | "documents" | "qa" | "timeline" | "pricing" | "questionCatalog" | "tradein" | "pos" | "notification" | "erp" | "settings";
type BackofficeView = "intakeApp" | "opsApp";
type MeResponse = { user?: { role: Role; fullName: string } | null };
type BuybackListItem = {
  id: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "COMPLETED";
  offeredPrice: string | number;
  agreedPrice: string | number | null;
  createdAt?: string;
  customerId?: string;
  branchId?: string | null;
  customer?: { fullName?: string } | null;
  device?: { brand?: string; model?: string; imei?: string | null } | null;
};

type BuybackDetail = BuybackListItem & {
  customer?: { fullName?: string; phone?: string; nationalId?: string; email?: string | null; notes?: string | null } | null;
  device?: { brand?: string; model?: string; imei?: string | null; conditionNote?: string | null } | null;
  documents?: Array<{ kind: "PDF" | "IMAGE" | "IDENTITY"; name: string; fileType: string; url: string | null }>;
  qa?: Array<{ soru: string; musteriYaniti: string; vendorDegerlendirmesi: string }>;
  timeline?: Array<{ eventType: string; actor: string; at: string; status?: string }>;
};
type Product = { id: string; name: string; barcode?: string; salePrice: string | number; stock?: number; branchStocks?: Array<{ branchId: string; stock: number }> };
type Customer = { id: string; fullName: string; phone?: string };
type CartItem = { productId: string; name: string; unitPrice: number; quantity: number; stock: number };
type PricingRule = { id: string; brand: string; modelPattern: string | null; basePrice: number; excellentBonusPct: number; goodBonusPct: number; badPenaltyPct: number; isActive: boolean };
type CatalogItem = { id: string; category: string; brand: string; model: string; basePrice: number; minPrice: number; questionSetJson: string };

type BranchOption = { id: string; name: string };

export default function BuybackBackofficePage() {
  const enabled = (process.env.NEXT_PUBLIC_BUYBACK_BACKOFFICE_ENABLED ?? "true").toLowerCase() === "true";
  const adminOnly = (process.env.NEXT_PUBLIC_BUYBACK_BACKOFFICE_ADMIN_ONLY ?? "false").toLowerCase() === "true";

  const [me, setMe] = useState<MeResponse["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BuybackListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<BuybackDetail | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>("intake");
  const [activeView, setActiveView] = useState<BackofficeView>("intakeApp");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | BuybackListItem["status"]>("ALL");
  const [bulkStatus, setBulkStatus] = useState<BuybackListItem["status"]>("APPROVED");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [onlyActionPending, setOnlyActionPending] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [posQuery, setPosQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT_CARD" | "ON_ACCOUNT">("CASH");
  const [posCustomerId, setPosCustomerId] = useState("");
  const [posLoading, setPosLoading] = useState(false);
  const [lastPosTxn, setLastPosTxn] = useState<{ no: string; total: number } | null>(null);

  const [qaDraft, setQaDraft] = useState<Array<{ soru: string; musteriYaniti: string; vendorDegerlendirmesi: string }>>([]);
  const [erpJson, setErpJson] = useState("{\"pricingRules\":[]}");
  const [csvData, setCsvData] = useState("kategori,marka,model,fiyat,min_fiyat,soru_seti\ntelefon,Apple,iPhone 13 128 GB,25000,3750,[]");
  const [tradeinProductId, setTradeinProductId] = useState("");
  const [tradeinQuote, setTradeinQuote] = useState<{ grossAmount: number; differenceAmount: number; buybackCredit: number } | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3>(1);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intake, setIntake] = useState({
    fullName: "",
    phone: "",
    nationalId: "",
    email: "",
    city: "",
    district: "",
    address: "",
    brand: "Apple",
    model: "",
    storage: "",
    imei: "",
    color: "",
    screenCondition: "good" as "excellent" | "good" | "bad",
    bodyCondition: "good" as "excellent" | "good" | "bad",
    batteryHealth: "between80_90" as "above90" | "between80_90" | "below80",
    hasBrokenComponent: false,
    offeredPrice: "",
    imageFrontUrl: "",
    imageBackUrl: "",
    imageTopUrl: "",
    imageBottomUrl: "",
    condition: "İyi",
  });

  useEffect(() => {
    const b = sessionStorage.getItem("buyback_backoffice_branch");
    if (b) setBranchId(b);
  }, []);
  useEffect(() => {
    if (branchId) sessionStorage.setItem("buyback_backoffice_branch", branchId);
  }, [branchId]);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((json) => {
        const list: BranchOption[] = Array.isArray(json) ? json : (json?.data ?? []);
        setBranches(list);
        setBranchId((current) => (current && list.some((b) => b.id === current)) ? current : (list[0]?.id ?? ""));
      })
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json: MeResponse) => setMe(json.user ?? null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/products"), fetch("/api/customers"), fetch("/api/offer-pricing-rules")])
      .then(async ([p, c, pr]) => {
        const [pj, cj, prj] = await Promise.all([p.json(), c.json(), pr.json()]);
        setProducts(Array.isArray(pj) ? pj : []);
        setCustomers(Array.isArray(cj) ? cj : []);
        setPricingRules(Array.isArray(prj) ? prj : []);
      })
      .catch(() => {
        setProducts([]);
        setCustomers([]);
        setPricingRules([]);
      });
  }, []);

  useEffect(() => {
    if (products.length > 0 && !tradeinProductId) setTradeinProductId(products[0].id);
  }, [products, tradeinProductId]);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/buybacks", { headers: { "x-branch-id": branchId } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Liste yuklenemedi");
    const list = (Array.isArray(json) ? json : []) as BuybackListItem[];
    setItems(list);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  }, [branchId, selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/buybacks/${id}`, { headers: { "x-branch-id": branchId } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Detay yuklenemedi");
    setDetail(json as BuybackDetail);
  }, [branchId]);

  useEffect(() => {
    if (!enabled || loading || !me) return;
    void loadList();
  }, [enabled, loading, me, loadList]);
  useEffect(() => {
    if (activeModule !== "questionCatalog") return;
    setCatalogLoading(true);
    fetch("/api/buyback/catalog")
      .then((r) => r.json())
      .then((json) => setCatalogItems(Array.isArray(json?.items) ? json.items : []))
      .catch(() => setCatalogItems([]))
      .finally(() => setCatalogLoading(false));
  }, [activeModule]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => setQaDraft(detail?.qa ?? []), [detail?.id, detail?.qa]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((it) => {
      if (status !== "ALL" && it.status !== status) return false;
      if (onlyActionPending && it.status !== "DRAFT") return false;
      if (dateFrom && it.createdAt && new Date(it.createdAt).toISOString().slice(0, 10) < dateFrom) return false;
      if (dateTo && it.createdAt && new Date(it.createdAt).toISOString().slice(0, 10) > dateTo) return false;
      if (!term) return true;
      const bag = [it.id, it.customer?.fullName ?? "", it.device?.brand ?? "", it.device?.model ?? "", it.device?.imei ?? ""].join(" ").toLowerCase();
      return bag.includes(term);
    });
  }, [items, search, status, dateFrom, dateTo, onlyActionPending]);

  const queueItems = useMemo(() => filtered.filter((x) => x.status === "DRAFT").sort((a, b) => ageHours(b.createdAt) - ageHours(a.createdAt)), [filtered]);
  const totalOffer = useMemo(() => filtered.reduce((s, x) => s + Number(x.offeredPrice || 0), 0), [filtered]);
  const todayBuybacks = useMemo(() => filtered.filter((x) => (x.createdAt ? new Date(x.createdAt).toDateString() : "") === new Date().toDateString()).length, [filtered]);
  const avgOffer = filtered.length > 0 ? Math.round(totalOffer / filtered.length) : 0;

  const filteredProducts = useMemo(() => {
    const term = posQuery.trim().toLowerCase();
    if (!term) return products.slice(0, 50);
    return products.filter((p) => `${p.name} ${p.barcode ?? ""}`.toLowerCase().includes(term)).slice(0, 50);
  }, [products, posQuery]);
  const posTotal = useMemo(() => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [cart]);
  const modelOptions = useMemo(
    () =>
      pricingRules
        .filter((r) => r.brand.toLowerCase() === intake.brand.toLowerCase() && r.modelPattern)
        .map((r) => String(r.modelPattern))
        .slice(0, 30),
    [pricingRules, intake.brand],
  );

  const images = (detail?.documents ?? []).filter((d) => d.kind === "IMAGE");
  const pdfs = (detail?.documents ?? []).filter((d) => d.kind === "PDF");
  const identities = (detail?.documents ?? []).filter((d) => d.kind === "IDENTITY");

  async function runBulkStatus() {
    if (selectedIds.length === 0) return toast.error("Secili kayit yok.");
    const res = await fetch("/api/buybacks/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Toplu guncelleme basarisiz");
    toast.success("Toplu durum guncellendi");
    await loadList();
  }

  function exportBackofficeCsv() {
    const rows = [["buybackId", "sube", "durum", "tarih", "musteri", "marka", "model", "seriNo", "teklif"], ...filtered.map((it) => [it.id, branches.find((b) => b.id === (it.branchId ?? branchId))?.name ?? "Atanmamis", statusLabel(it.status), it.createdAt ? new Date(it.createdAt).toLocaleDateString("tr-TR") : "-", it.customer?.fullName ?? "-", it.device?.brand ?? "-", it.device?.model ?? "-", it.device?.imei ?? "-", String(Number(it.agreedPrice ?? it.offeredPrice))])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buyback-backoffice-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function stockForBranch(p: Product) {
    const branchStock = p.branchStocks?.find((b) => b.branchId === branchId)?.stock;
    return typeof branchStock === "number" ? branchStock : Number(p.stock ?? 0);
  }
  function addToCart(p: Product) {
    const stock = stockForBranch(p);
    if (stock <= 0) return;
    setCart((prev) => {
      const found = prev.find((x) => x.productId === p.id);
      if (found) {
        if (found.quantity >= found.stock) return prev;
        return prev.map((x) => (x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { productId: p.id, name: p.name, unitPrice: Number(p.salePrice), quantity: 1, stock }];
    });
  }

  async function runPosCheckout() {
    if (cart.length === 0) return;
    if (paymentMethod === "ON_ACCOUNT" && !posCustomerId) return;
    setPosLoading(true);
    try {
      const res = await fetch("/api/pos/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map((x) => ({ productId: x.productId, quantity: x.quantity, unitPrice: x.unitPrice, discountPct: 0 })), paymentMethod, customerId: paymentMethod === "ON_ACCOUNT" ? posCustomerId : undefined, branchId, relatedBuybackId: detail?.id ?? undefined, tradeInRef: detail?.id ? `TRDIN-${detail.id.slice(-6)}` : undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "POS checkout basarisiz");
      setLastPosTxn({ no: json.transactionNo, total: Number(json.totalAmount ?? 0) });
      setCart([]);
      setPosCustomerId("");
      toast.success("POS satis tamamlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "POS checkout hatasi");
    } finally {
      setPosLoading(false);
    }
  }

  async function runTradeInQuote() {
    if (!detail) return toast.error("Once bir islem secin");
    const product = products.find((p) => p.id === tradeinProductId);
    if (!product) return toast.error("Urun secin");
    const res = await fetch("/api/trade-in/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productPrice: Number(product.salePrice), buybackOfferedPrice: Number(detail.offeredPrice) }) });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Takas hesaplanamadi");
    setTradeinQuote(json);
  }

  async function runNotificationQueue() {
    const res = await fetch("/api/buyback/notifications/process", { method: "POST" });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Bildirim kuyrugu islenemedi");
    toast.success("Bildirim kuyrugu islendi");
  }
  async function runErpSync() {
    const res = await fetch("/api/buyback/erp-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: erpJson });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "ERP sync basarisiz");
    toast.success(`ERP sync tamamlandi (${json.imported ?? 0})`);
  }
  async function runCsvImport() {
    const res = await fetch("/api/buyback/import/pricing-csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: csvData }) });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "CSV import basarisiz");
    toast.success(`CSV import tamamlandi (${json.imported ?? 0})`);
  }
  async function calculateIntakeOffer() {
    if (!intake.brand || !intake.model) return toast.error("Marka ve model secin.");
    const res = await fetch("/api/buyback/offer-calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: intake.brand,
        model: intake.model,
        screenCondition: intake.screenCondition,
        bodyCondition: intake.bodyCondition,
        batteryHealth: intake.batteryHealth,
        hasBrokenComponent: intake.hasBrokenComponent,
      }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Teklif hesaplanamadi");
    setIntake((prev) => ({ ...prev, offeredPrice: String(json.offeredPrice ?? 0) }));
    toast.success("Tahmini teklif hesaplandi");
  }
  async function createBuybackFromIntake() {
    if (!intake.fullName || !intake.phone || !intake.model || !intake.brand) {
      return toast.error("Lütfen müşteri ve cihaz bilgilerini doldurun.");
    }
    if ((intake.nationalId || "").length !== 11) return toast.error("TC Kimlik Numarası 11 hane olmalıdır.");
    if ((intake.imei || "").length < 14) return toast.error("IMEI en az 14 hane olmalıdır.");
    const offeredPrice = Number(intake.offeredPrice || 0);
    if (!Number.isFinite(offeredPrice) || offeredPrice <= 0) return toast.error("Alım fiyatı geçersiz.");

    setIntakeBusy(true);
    try {
      const customerNotes = [
        intake.email ? `Eposta:${intake.email}` : "",
        `Sadeleştirilmiş cihaz alımı`,
      ]
        .filter(Boolean)
        .join(" | ");

      const customerRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: intake.nationalId,
          fullName: intake.fullName,
          phone: intake.phone,
          email: intake.email || null,
          notes: customerNotes,
        }),
      });
      const customerJson = await customerRes.json();
      if (!customerRes.ok) throw new Error(customerJson.error ?? "Müşteri oluşturulamadı.");

      const deviceRes = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerJson.id,
          brand: intake.brand,
          model: intake.model,
          storage: intake.storage || parseStorageFromModel(intake.model),
          imei: intake.imei,
          color: intake.color || null,
          conditionNote: `Kondisyon: ${intake.condition}`,
          isSecondHandStock: true,
        }),
      });
      const deviceJson = await deviceRes.json();
      if (!deviceRes.ok) throw new Error(deviceJson.error ?? "Cihaz oluşturulamadı.");

      const dealRes = await fetch("/api/buybacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerJson.id,
          deviceId: deviceJson.id,
          offeredPrice,
          agreedPrice: offeredPrice,
          status: "APPROVED",
          evaluationNote: "Sadeleştirilmiş Cihaz Alımı",
          branchId: branchId || null,
        }),
      });
      const dealJson = await dealRes.json();
      if (!dealRes.ok) throw new Error(dealJson.error ?? "Buyback kaydı oluşturulamadı.");

      toast.success("Cihaz alım işlemi başarıyla kaydedildi.");
      
      // Reset form
      setIntake({
        fullName: "",
        phone: "",
        nationalId: "",
        email: "",
        city: "",
        district: "",
        address: "",
        brand: "Apple",
        model: "",
        storage: "",
        imei: "",
        color: "",
        screenCondition: "good",
        bodyCondition: "good",
        batteryHealth: "between80_90",
        hasBrokenComponent: false,
        offeredPrice: "",
        imageFrontUrl: "",
        imageBackUrl: "",
        imageTopUrl: "",
        imageBottomUrl: "",
        condition: "İyi",
      });

      await loadList();
      setSelectedId(dealJson.id);
      setActiveModule("queue");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cihaz alımı başarısız.");
    } finally {
      setIntakeBusy(false);
    }
  }
  function runQaScore() {
    if (qaDraft.length === 0) return toast.error("Soru kaydi yok");
    const positive = qaDraft.filter((x) => /evet|normal|iyi|calisiyor/i.test(`${x.musteriYaniti} ${x.vendorDegerlendirmesi}`)).length;
    const score = Math.round((positive / qaDraft.length) * 100);
    toast.success(`Kalite puani: ${score}`);
  }
  function saveQaDraft() {
    toast.success("Soru-cevap kaydi local olarak kaydedildi");
  }
  function pickQueueItem(id: string) {
    setSelectedId(id);
  }
  function goDetail(id: string) {
    setSelectedId(id);
    setActiveModule("detail");
  }

  if (!enabled) return <section className="panel" style={{ padding: "1rem" }}><h2>Backoffice Kapali</h2><p>BUYBACK_BACKOFFICE_ENABLED kapali.</p></section>;
  if (loading) return <section className="panel" style={{ padding: "1rem" }}>Yukleniyor...</section>;
  if (!me) return <section className="panel" style={{ padding: "1rem" }}>Oturum gerekli.</section>;
  if (adminOnly && me.role !== "ADMIN" && me.role !== "PLATFORM_OWNER" && me.role !== "MANAGER") return <section className="panel" style={{ padding: "1rem" }}>Bu alan pilotta sadece ADMIN rolune acik.</section>;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div className="panel" style={{ padding: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div><h2 style={{ margin: 0 }}>Buyback Operasyon</h2><p style={{ margin: "4px 0 0", color: "#64748b" }}>Kuyruk oncelikli cok katmanli backoffice</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="primary-btn" style={{ width: 150 }} onClick={() => setActiveModule("intake")}>Yeni Islem Baslat</button>
          <select className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ width: 180 }}>{branches.length === 0 ? <option value="">Sube yok</option> : branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <button className="field" style={{ width: 110 }} onClick={() => void loadList()}>Yenile</button>
          <button className="field" style={{ width: 130 }} onClick={exportBackofficeCsv}>Excel&apos;e Aktar</button>
        </div>
      </div>
      <div className="panel" style={{ padding: "0.6rem", display: "flex", gap: 8 }}>
        <button
          className={activeView === "intakeApp" ? "primary-btn" : "field"}
          style={{ width: 180 }}
          onClick={() => {
            setActiveView("intakeApp");
            setActiveModule("intake");
          }}
        >
          Buyback Alim Alani
        </button>
        <button
          className={activeView === "opsApp" ? "primary-btn" : "field"}
          style={{ width: 220 }}
          onClick={() => {
            setActiveView("opsApp");
            setActiveModule("queue");
          }}
        >
          Gelen Verileri Yonet
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <StatCard label="Toplam Buyback" value={filtered.length} />
        <StatCard label="Bekleyen Islem" value={queueItems.length} accent="#f59e0b" />
        <StatCard label="Toplam Teklif" valueText={`${Math.round(totalOffer).toLocaleString("tr-TR")} TL`} accent="#16a34a" />
        <StatCard label="Rol" valueText={me.role} />
        <StatCard label="Bugun Islem" value={todayBuybacks} />
        <StatCard label="Ortalama Teklif" valueText={`${avgOffer.toLocaleString("tr-TR")} TL`} />
        <StatCard label="Pinli Sube" valueText={branches.find((x) => x.id === branchId)?.name ?? "-"} />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "250px 1fr" }}>
        <aside className="panel" style={{ padding: "0.8rem", alignSelf: "start" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>MODULLER</p>
          {(activeView === "intakeApp"
            ? (["intake"] as ModuleKey[])
            : (["queue", "list", "detail", "documents", "qa", "timeline", "pricing", "questionCatalog", "tradein", "pos", "notification", "erp", "settings"] as ModuleKey[])
          ).map((m) => (
            <button key={m} className="field" style={{ marginBottom: 8, background: activeModule === m ? "#e6fffb" : "#fff" }} onClick={() => setActiveModule(m)}>{moduleLabel(m)}</button>
          ))}
        </aside>

        <div style={{ display: "grid", gap: 10 }}>
          {activeModule === "intake" && (
            <div className="panel" style={{ padding: "1.5rem", display: "grid", gap: 20 }}>
              <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Cihaz Alım Formu</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Müşteriden cihaz satın alırken kullanılacak pratik alım formu</p>
              </div>

              <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}>
                {/* Sol Kolon: Müşteri Bilgileri */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#334155", borderBottom: "1px dashed #e2e8f0", paddingBottom: 6 }}>Müşteri Bilgileri</h4>
                  
                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Adı Soyadı *</label>
                    <input className="field" placeholder="Müşteri Adı Soyadı" value={intake.fullName} onChange={(e) => setIntake((p) => ({ ...p, fullName: e.target.value }))} />
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Telefon Numarası *</label>
                    <input className="field" placeholder="0555 555 5555" value={intake.phone} onChange={(e) => setIntake((p) => ({ ...p, phone: e.target.value }))} />
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>TC Kimlik Numarası *</label>
                    <input className="field" placeholder="11 Haneli TC Kimlik No" value={intake.nationalId} onChange={(e) => setIntake((p) => ({ ...p, nationalId: e.target.value.replace(/[^\d]/g, "").slice(0, 11) }))} />
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>E-posta Adresi (İsteğe Bağlı)</label>
                    <input className="field" placeholder="ornek@eposta.com" value={intake.email} onChange={(e) => setIntake((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>

                {/* Sağ Kolon: Cihaz ve Fiyat Bilgileri */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#334155", borderBottom: "1px dashed #e2e8f0", paddingBottom: 6 }}>Cihaz ve Fiyat Bilgileri</h4>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Cihaz Markası *</label>
                    <input className="field" placeholder="Örn: Apple, Samsung, Xiaomi" value={intake.brand} onChange={(e) => setIntake((p) => ({ ...p, brand: e.target.value }))} />
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Cihaz Modeli *</label>
                    <input className="field" placeholder="Örn: iPhone 13 128GB" value={intake.model} onChange={(e) => setIntake((p) => ({ ...p, model: e.target.value }))} />
                    {modelOptions.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {modelOptions.slice(0, 5).map((m) => (
                          <button 
                            key={m} 
                            type="button" 
                            className="field" 
                            style={{ width: "auto", padding: "2px 8px", fontSize: 11, background: "#f1f5f9", cursor: "pointer" }} 
                            onClick={() => setIntake((p) => ({ ...p, model: m, storage: parseStorageFromModel(m) }))}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>IMEI Numarası *</label>
                    <input className="field" placeholder="15 haneli IMEI girin" value={intake.imei} onChange={(e) => setIntake((p) => ({ ...p, imei: e.target.value.replace(/[^\d]/g, "").slice(0, 15) }))} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Cihaz Kondisyonu *</label>
                      <select className="field" value={intake.condition} onChange={(e) => setIntake((p) => ({ ...p, condition: e.target.value }))}>
                        <option value="Mükemmel">Mükemmel</option>
                        <option value="İyi">İyi</option>
                        <option value="Orta">Orta</option>
                        <option value="Kırık / Arızalı">Kırık / Arızalı</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Alım Fiyatı (TL) *</label>
                      <input className="field" type="number" min={0} placeholder="Örn: 15000" value={intake.offeredPrice} onChange={(e) => setIntake((p) => ({ ...p, offeredPrice: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 15 }}>
                <button 
                  className="primary-btn" 
                  style={{ width: 220, height: 42, fontSize: 14, fontWeight: 700 }}
                  disabled={intakeBusy}
                  onClick={() => void createBuybackFromIntake()}
                >
                  {intakeBusy ? "Kaydediliyor..." : "Cihaz Alımını Kaydet"}
                </button>
              </div>
            </div>
          )}
          {(activeModule === "queue" || activeModule === "list") && (
            <div className="panel" style={{ padding: "0.7rem" }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Yeni buyback alimi icin sol menuden <strong>Islem Alimi</strong> modulu kullanilir.</p>
                <button className="field" style={{ width: 150 }} onClick={() => setActiveModule("intake")}>Islem Alimina Git</button>
              </div>
              <div className="form-grid-4">
                <input className="field" placeholder="Buyback ID, musteri, seri no..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="field" value={status} onChange={(e) => setStatus(e.target.value as "ALL" | BuybackListItem["status"])}><option value="ALL">Tum Durumlar</option><option value="DRAFT">Mutabakat Bekliyor</option><option value="APPROVED">Onayli</option><option value="REJECTED">Reddedildi</option><option value="COMPLETED">Tamamlandi</option></select>
                <input className="field" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <input className="field" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={onlyActionPending} onChange={(e) => setOnlyActionPending(e.target.checked)} />Sadece action pending</label>
                <button className="field" style={{ width: 130 }} onClick={() => { setSearch(""); setStatus("ALL"); setDateFrom(""); setDateTo(""); setOnlyActionPending(false); }}>Filtre Temizle</button>
              </div>
            </div>
          )}

          {activeModule === "queue" && (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.1fr 1.9fr" }}>
              <div className="panel panel-scroll" style={{ maxHeight: 650 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Buyback ID</th>
                      <th>Yas</th>
                      <th>Durum</th>
                      <th>Musteri</th>
                      <th>Teklif</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueItems.map((it) => (
                      <tr
                        key={it.id}
                        style={selectedId === it.id ? { background: "#eefbf8" } : undefined}
                      >
                        <td>#{it.id.slice(-7)}</td>
                        <td>{ageHours(it.createdAt)}s</td>
                        <td><StatusBadge status={it.status} /></td>
                        <td>{it.customer?.fullName ?? "-"}</td>
                        <td style={{ fontWeight: 700, color: "#15803d" }}>
                          {Number(it.agreedPrice ?? it.offeredPrice).toLocaleString("tr-TR")} TL
                        </td>
                        <td>
                          <button className="field" style={{ width: 100 }} onClick={() => pickQueueItem(it.id)}>
                            Workspace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {detail ? (
                  <>
                    <div className="panel" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <strong>Canli Islem Workspace</strong>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="field" style={{ width: 110 }} onClick={() => setActiveModule("documents")}>Belgeler</button>
                          <button className="field" style={{ width: 90 }} onClick={() => setActiveModule("qa")}>Soru-Cevap</button>
                          <button className="primary-btn" style={{ width: 105 }} onClick={() => setActiveModule("detail")}>Tam Detay</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                        <InfoCard title="Cihaz" lines={[`Marka: ${detail.device?.brand ?? "-"}`, `Model: ${detail.device?.model ?? "-"}`, `Seri: ${detail.device?.imei ?? "-"}`]} />
                        <InfoCard title="Musteri" lines={[`Ad Soyad: ${detail.customer?.fullName ?? "-"}`, `Telefon: ${detail.customer?.phone ?? "-"}`, `TC: ${detail.customer?.nationalId ?? "-"}`]} />
                        <InfoCard title="Teklif/Ops" lines={[`Durum: ${statusLabel(detail.status)}`, `On Teklif: ${Number(detail.offeredPrice).toLocaleString("tr-TR")} TL`, `Final: ${Number(detail.agreedPrice ?? detail.offeredPrice).toLocaleString("tr-TR")} TL`]} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.2fr 1fr" }}>
                      <div className="panel" style={{ padding: "0.7rem" }}>
                        <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Belge Ozeti</p>
                        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                          <InfoCard title="Gorsel" lines={[`${images.length} adet`]} />
                          <InfoCard title="PDF" lines={[`${pdfs.length} adet`]} />
                          <InfoCard title="Kimlik" lines={[`${identities.length} adet`]} />
                        </div>
                      </div>
                      <div className="panel" style={{ padding: "0.7rem" }}>
                        <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Timeline Ozeti</p>
                        {(detail.timeline ?? []).length === 0 ? (
                          <p style={{ margin: 0, color: "#64748b" }}>Timeline kaydi bulunamadi.</p>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {(detail.timeline ?? []).slice(0, 3).map((t, i) => (
                              <div key={`${t.eventType}-${i}`} style={{ fontSize: 13 }}>
                                <strong>{t.eventType}</strong> - {new Date(t.at).toLocaleString("tr-TR")}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-box">Soldan bir kayit secin, canli 3 kolon islem paneli burada acilsin.</div>
                )}
              </div>
            </div>
          )}

          {activeModule === "list" && (
            <>
              <div className="panel" style={{ padding: "0.7rem", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><select className="field" style={{ width: 180 }} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as BuybackListItem["status"])}><option value="DRAFT">DRAFT</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="COMPLETED">COMPLETED</option></select><button className="primary-btn" onClick={() => void runBulkStatus()}>Toplu Durum Guncelle</button></div>
              <div className="panel panel-scroll"><table className="data-table"><thead><tr><th><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={(e) => setSelectedIds(e.target.checked ? filtered.map((x) => x.id) : [])} /></th><th>Buyback ID</th><th>Sube</th><th>Durum</th><th>Tarih</th><th>Musteri</th><th>Cihaz</th><th>Model</th><th>Seri No</th><th>Teklif</th><th></th></tr></thead><tbody>{filtered.map((it) => <tr key={it.id}><td><input type="checkbox" checked={selectedIds.includes(it.id)} onChange={(e) => setSelectedIds((p) => e.target.checked ? [...p, it.id] : p.filter((id) => id !== it.id))} /></td><td>#{it.id.slice(-7)}</td><td>{branches.find((b) => b.id === (it.branchId ?? branchId))?.name ?? "Atanmamis"}</td><td><StatusBadge status={it.status} /></td><td>{it.createdAt ? new Date(it.createdAt).toLocaleDateString("tr-TR") : "-"}</td><td>{it.customer?.fullName ?? "-"}</td><td>{it.device?.brand ?? "-"}</td><td>{it.device?.model ?? "-"}</td><td>{it.device?.imei ?? "-"}</td><td style={{ fontWeight: 700, color: "#15803d" }}>{Number(it.agreedPrice ?? it.offeredPrice).toLocaleString("tr-TR")} TL</td><td><button className="field" style={{ width: 80 }} onClick={() => goDetail(it.id)}>Detay</button></td></tr>)}</tbody></table></div>
            </>
          )}

          {activeModule === "detail" && (detail ? <DetailPanel detail={detail} /> : <div className="empty-box">Once bir islem secin.</div>)}
          {activeModule === "documents" && (detail ? <div style={{ display: "grid", gap: 10 }}><DocumentSection title={`Gorseller (${images.length})`} items={images} /><DocumentSection title={`PDFler (${pdfs.length})`} items={pdfs} /><DocumentSection title={`Kimlik (${identities.length})`} items={identities} /></div> : <div className="empty-box">Belgeler icin once kayit secin.</div>)}
          {activeModule === "qa" && (detail ? <div className="panel" style={{ padding: "0.8rem" }}><table className="data-table"><thead><tr><th>Soru</th><th>Musteri Yaniti</th><th>Vendor Degerlendirmesi</th></tr></thead><tbody>{qaDraft.length === 0 ? <tr><td colSpan={3}>Soru kaydi yok.</td></tr> : qaDraft.map((q, i) => <tr key={`${q.soru}-${i}`}><td>{q.soru}</td><td><input className="field" value={q.musteriYaniti ?? ""} onChange={(e) => setQaDraft((p) => p.map((x, idx) => idx === i ? { ...x, musteriYaniti: e.target.value } : x))} /></td><td><input className="field" value={q.vendorDegerlendirmesi ?? ""} onChange={(e) => setQaDraft((p) => p.map((x, idx) => idx === i ? { ...x, vendorDegerlendirmesi: e.target.value } : x))} /></td></tr>)}</tbody></table><div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}><button className="field" style={{ width: 100 }} onClick={saveQaDraft}>Kaydet</button><button className="primary-btn" style={{ width: 100 }} onClick={runQaScore}>Hesapla</button></div></div> : <div className="empty-box">Soru-cevap icin once kayit secin.</div>)}
          {activeModule === "timeline" && (detail ? <div style={{ display: "grid", gap: 8 }}>{(detail.timeline ?? []).length === 0 ? <div className="empty-box">Timeline kaydi bulunamadi.</div> : (detail.timeline ?? []).map((t, i) => <div key={`${t.eventType}-${i}`} className="panel" style={{ padding: "0.65rem", display: "flex", justifyContent: "space-between", gap: 10 }}><div><strong>{t.eventType}</strong> <span style={{ color: "#64748b" }}>({t.actor})</span></div><div>{new Date(t.at).toLocaleString("tr-TR")} {t.status ? `- ${t.status}` : ""}</div></div>)}</div> : <div className="empty-box">Timeline icin once kayit secin.</div>)}
          {activeModule === "pricing" && <div className="panel panel-scroll"><table className="data-table"><thead><tr><th>Marka</th><th>Model</th><th>Base</th><th>Excellent</th><th>Good</th><th>Bad</th><th>Aktif</th></tr></thead><tbody>{pricingRules.length === 0 ? <tr><td colSpan={7}>Kural bulunamadi.</td></tr> : pricingRules.map((r) => <tr key={r.id}><td>{r.brand}</td><td>{r.modelPattern ?? "*"}</td><td>{r.basePrice}</td><td>{r.excellentBonusPct}</td><td>{r.goodBonusPct}</td><td>{r.badPenaltyPct}</td><td>{r.isActive ? "Evet" : "Hayir"}</td></tr>)}</tbody></table></div>}
          {activeModule === "questionCatalog" && (
            <div className="panel" style={{ padding: "0.85rem", display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>CSV Soru Kirilimlari (Tum Telefon Modelleri)</h3>
              <p style={{ margin: 0, color: "#64748b" }}>Yukledigin CSV icindeki `soru_seti` alanlari model bazinda burada tam listelenir.</p>
              {catalogLoading ? (
                <div className="empty-box">Yukleniyor...</div>
              ) : catalogItems.length === 0 ? (
                <div className="empty-box">Katalog kaydi bulunamadi. Once CSV import calistir.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {catalogItems.map((item) => {
                    const parsed = parseQuestionSet(item.questionSetJson);
                    return (
                      <div key={item.id} className="panel" style={{ padding: "0.7rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <strong>{item.brand} {item.model}</strong>
                          <span style={{ color: "#334155" }}>Base: {Number(item.basePrice).toLocaleString("tr-TR")} TL / Min: {Number(item.minPrice).toLocaleString("tr-TR")} TL</span>
                        </div>
                        {parsed.length === 0 ? (
                          <p style={{ margin: "8px 0 0", color: "#64748b" }}>Bu modelde soru_seti bos.</p>
                        ) : (
                          <div className="panel panel-scroll" style={{ marginTop: 8, maxHeight: 300 }}>
                            <table className="data-table">
                              <thead><tr><th>Soru</th><th>Secenek</th><th>Etki</th></tr></thead>
                              <tbody>
                                {parsed.map((row, i) => (
                                  <tr key={`${item.id}-${i}`}>
                                    <td>{row.question}</td>
                                    <td>{row.answer}</td>
                                    <td>{row.effect}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeModule === "tradein" && <div className="panel" style={{ padding: "0.8rem" }}><div className="form-grid-3"><select className="field" value={tradeinProductId} onChange={(e) => setTradeinProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="field" onClick={() => void runTradeInQuote()}>Fark Hesapla</button><div className="panel" style={{ padding: "0.6rem" }}>{tradeinQuote ? `Fark: ${Number(tradeinQuote.differenceAmount ?? 0).toLocaleString("tr-TR")} TL` : "Takas teklifi hesaplanmadi."}</div></div></div>}
          {activeModule === "pos" && <div className="panel" style={{ padding: "0.9rem" }}><h3 style={{ marginTop: 0 }}>POS Satis Modulu</h3><div className="form-grid-4" style={{ marginBottom: 10 }}><input className="field" placeholder="Urun ara / barkod..." value={posQuery} onChange={(e) => setPosQuery(e.target.value)} /><select className="field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CREDIT_CARD" | "ON_ACCOUNT")}><option value="CASH">Nakit</option><option value="CREDIT_CARD">Kredi Karti</option><option value="ON_ACCOUNT">Veresiye</option></select><select className="field" value={posCustomerId} onChange={(e) => setPosCustomerId(e.target.value)} disabled={paymentMethod !== "ON_ACCOUNT"}><option value="">Musteri sec</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select><button className="primary-btn" onClick={() => void runPosCheckout()} disabled={posLoading || cart.length === 0}>{posLoading ? "Isleniyor..." : "Satisi Tamamla"}</button></div><div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.2fr 1fr" }}><div className="panel panel-scroll"><table className="data-table"><thead><tr><th>Urun</th><th>Stok</th><th>Fiyat</th><th></th></tr></thead><tbody>{filteredProducts.map((p) => <tr key={p.id}><td>{p.name}</td><td>{stockForBranch(p)}</td><td>{Number(p.salePrice).toLocaleString("tr-TR")} TL</td><td><button className="field" style={{ width: 70 }} onClick={() => addToCart(p)}>Ekle</button></td></tr>)}</tbody></table></div><div className="panel" style={{ padding: "0.8rem" }}><h4 style={{ marginTop: 0 }}>Sepet</h4><div style={{ display: "grid", gap: 8 }}>{cart.length === 0 ? <div className="empty-box">Sepet bos.</div> : cart.map((c) => <div key={c.productId} className="panel" style={{ padding: "0.6rem", display: "flex", justifyContent: "space-between", gap: 8 }}><span>{c.name} x{c.quantity}</span><strong>{(c.unitPrice * c.quantity).toLocaleString("tr-TR")} TL</strong></div>)}</div><p style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 800 }}>Toplam: {posTotal.toLocaleString("tr-TR")} TL</p>{lastPosTxn && <p style={{ margin: "6px 0 0", color: "#1d4ed8", fontWeight: 700 }}>Son Islem: {lastPosTxn.no} / {lastPosTxn.total.toLocaleString("tr-TR")} TL</p>}</div></div></div>}
          {activeModule === "notification" && <div className="panel" style={{ padding: "0.85rem" }}><h3 style={{ marginTop: 0 }}>Bildirim Kuyrugu</h3><button className="primary-btn" onClick={() => void runNotificationQueue()}>Kuyrugu Isle</button></div>}
          {activeModule === "erp" && <div style={{ display: "grid", gap: 10 }}><div className="panel" style={{ padding: "0.8rem" }}><h3 style={{ marginTop: 0 }}>ERP Sync (JSON)</h3><textarea className="field" rows={6} value={erpJson} onChange={(e) => setErpJson(e.target.value)} /><div style={{ marginTop: 8 }}><button className="primary-btn" onClick={() => void runErpSync()}>ERP Sync Calistir</button></div></div><div className="panel" style={{ padding: "0.8rem" }}><h3 style={{ marginTop: 0 }}>CSV Import (Pricing Rules)</h3><textarea className="field" rows={6} value={csvData} onChange={(e) => setCsvData(e.target.value)} /><div style={{ marginTop: 8 }}><button className="primary-btn" onClick={() => void runCsvImport()}>CSV Import Calistir</button></div></div></div>}
          {activeModule === "settings" && <div className="panel" style={{ padding: "0.85rem" }}><h3 style={{ marginTop: 0 }}>Backoffice Ayarlari</h3><div className="form-grid-3"><div className="panel" style={{ padding: "0.6rem" }}><strong>Rol:</strong> {me.role}</div><div className="panel" style={{ padding: "0.6rem" }}><strong>Pinli Sube:</strong> {branches.find((x) => x.id === branchId)?.name ?? "-"}</div></div></div>}
        </div>
      </div>
    </section>
  );
}

function moduleLabel(key: ModuleKey) {
  const map: Record<ModuleKey, string> = { intake: "Islem Alimi", queue: "Kuyruk", list: "Islem Listesi", detail: "Islem Detayi", documents: "Belgeler/PDF", qa: "Soru-Cevap", timeline: "Timeline", pricing: "Fiyat Motoru", questionCatalog: "Soru Kirilimlari", tradein: "Takas", pos: "POS Satis", notification: "Bildirim", erp: "ERP/Import", settings: "Ayarlar" };
  return map[key] ?? key;
}
function statusLabel(status: BuybackListItem["status"]) {
  if (status === "DRAFT") return "Mutabakat Bekliyor";
  if (status === "APPROVED") return "Onayli";
  if (status === "REJECTED") return "Reddedildi";
  return "Tamamlandi";
}
function StatusBadge({ status }: { status: BuybackListItem["status"] }) {
  const map: Record<BuybackListItem["status"], { bg: string; color: string; label: string }> = { DRAFT: { bg: "#fef3c7", color: "#92400e", label: "100 - Mutabakat Bekliyor" }, APPROVED: { bg: "#dcfce7", color: "#166534", label: "Onayli" }, REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Reddedildi" }, COMPLETED: { bg: "#dbeafe", color: "#1d4ed8", label: "Tamamlandi" } };
  const s = map[status];
  return <span style={{ background: s.bg, color: s.color, padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{s.label}</span>;
}
function ageHours(createdAt?: string) { if (!createdAt) return 0; return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60))); }
function parseStorageFromModel(model: string) {
  const m = model.match(/(\d{2,4}\s?GB)/i);
  return m ? m[1].replace(/\s+/g, "") : "128GB";
}
function parseQuestionSet(raw: string) {
  try {
    const data = raw ? JSON.parse(raw) : [];
    if (Array.isArray(data)) {
      const rows: Array<{ question: string; answer: string; effect: string }> = [];
      data.forEach((questionBlock: any, qIdx) => {
        const q = String(questionBlock?.question ?? questionBlock?.soru ?? `Soru ${qIdx + 1}`);
        const answers = Array.isArray(questionBlock?.answers) ? questionBlock.answers : (Array.isArray(questionBlock?.secenekler) ? questionBlock.secenekler : []);
        if (answers.length === 0) {
          rows.push({ question: q, answer: "-", effect: "-" });
          return;
        }
        answers.forEach((a: any) => {
          rows.push({
            question: q,
            answer: String(a?.label ?? a?.title ?? a?.cevap ?? a?.answer ?? "-"),
            effect: String(a?.priceEffect ?? a?.effect ?? a?.fiyat_etkisi ?? a?.value ?? "-"),
          });
        });
      });
      return rows;
    }
    return [];
  } catch {
    return [];
  }
}
function StatCard({ label, value, valueText, accent }: { label: string; value?: number; valueText?: string; accent?: string }) {
  return <div className="panel" style={{ padding: "0.75rem 0.9rem" }}><p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{label}</p><p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: accent ?? "#0f172a" }}>{valueText ?? value?.toLocaleString("tr-TR") ?? "-"}</p></div>;
}
function QuestionBlock({ title, options, selected, onPick }: { title: string; options: string[]; selected: string; onPick: (value: string) => void }) {
  return (
    <div className="panel" style={{ padding: "0.75rem" }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700 }}>{title}</p>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        {options.map((option) => (
          <button
            key={option}
            className="field"
            style={{
              background: selected === option ? "#e6fff4" : "#fff",
              borderColor: selected === option ? "#20a56f" : "#d7e0ea",
            }}
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  return <div className="panel" style={{ padding: "0.75rem" }}><p style={{ margin: "0 0 8px", fontWeight: 700 }}>{title}</p><div style={{ display: "grid", gap: 5 }}>{lines.map((line, i) => <p key={`${title}-${i}`} style={{ margin: 0, color: "#334155", fontSize: 13 }}>{line}</p>)}</div></div>;
}
function DetailPanel({ detail }: { detail: BuybackDetail }) {
  return <div className="panel" style={{ padding: "0.8rem" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><h3 style={{ margin: 0 }}>Buyback ID: {detail.id.slice(-8)}</h3><StatusBadge status={detail.status} /></div><div style={{ display: "flex", gap: 8 }}><button className="field" disabled={detail.status === "COMPLETED"} style={{ width: 110 }}>Kargo Durumu</button><button className="field" style={{ width: 90 }}>Yazdir</button><button className="primary-btn" disabled={detail.status === "REJECTED"} style={{ width: 130 }}>Barkod Yazdir</button></div></div><div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}><InfoCard title="Cihaz Bilgileri" lines={["Kategori: Cep Telefonu", `Marka: ${detail.device?.brand ?? "-"}`, `Model: ${detail.device?.model ?? "-"}`, `Seri No: ${detail.device?.imei ?? "-"}`, `Durum: ${detail.status}`]} /><InfoCard title="Musteri Bilgileri" lines={[`Ad Soyad: ${detail.customer?.fullName ?? "-"}`, `Telefon: ${detail.customer?.phone ?? "-"}`, `TC: ${detail.customer?.nationalId ?? "-"}`, `Eposta: ${detail.customer?.email ?? "-"}`, `Adres/Not: ${detail.customer?.notes ?? "-"}`]} /><InfoCard title="Islem Detayi" lines={[`On Teklif: ${Number(detail.offeredPrice).toLocaleString("tr-TR")} TL`, `Final Teklif: ${Number(detail.agreedPrice ?? detail.offeredPrice).toLocaleString("tr-TR")} TL`, "Takas Ozeti: Aktif"]} /></div></div>;
}
function DocumentSection({ title, items }: { title: string; items: Array<{ name: string; fileType: string; url: string | null }> }) {
  return <div className="panel" style={{ padding: "0.75rem" }}><p style={{ margin: "0 0 8px", fontWeight: 700 }}>{title}</p>{items.length === 0 ? <div className="empty-box">Kayit yok.</div> : <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>{items.map((doc, i) => <a key={`${doc.name}-${i}`} className="panel" style={{ padding: "0.7rem", textAlign: "center" }} href={doc.url ?? "#"} target="_blank" rel="noreferrer"><div style={{ fontWeight: 700 }}>{doc.name}</div><div style={{ color: "#64748b", fontSize: 12 }}>{doc.fileType}</div></a>)}</div>}</div>;
}
