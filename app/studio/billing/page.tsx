"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantBillingRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  plan: string;
  licenseEnd: string;
  status: "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED";
  lsSubscriptionStatus?: string;
  lsRenewsAt?: string;
  lsCurrentPeriodEnd?: string;
  lsSubscriptionId?: string;
  balance: number; // pozitif = borçlu
  overdueAmount: number;
  totalCharges: number;
  totalCollections: number;
  billingLedger: Array<{
    id: string;
    type: "CHARGE" | "COLLECTION";
    category: string;
    amount: number;
    description: string;
    date: string;
    dueDate?: string;
    status?: "PAID" | "UNPAID";
  }>;
}

interface ExchangeRate {
  usdToTry: number;
  source: "live" | "fallback";
  updatedAt: string;
}

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: { Open: (url: string) => void; Close: () => void };
      Setup: (opts: Record<string, any>) => void;
    };
  }
}

// ─── Lemon.js Loader Hook ─────────────────────────────────────────────────────

function useLemonJS() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => {
      window.createLemonSqueezy?.();
    };
    document.head.appendChild(script);
    loaded.current = true;
  }, []);
}

function openLemonCheckout(url: string) {
  const embedUrl = url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(embedUrl);
  } else {
    window.open(embedUrl, "_blank");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ACTIVE: { label: "Aktif", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  NEAR_EXPIRY: { label: "Yakında Doluyor", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  EXPIRED: { label: "Süresi Doldu", bg: "bg-rose-50 text-rose-700 border-rose-200" },
};

const LS_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "✅ Aktif", color: "text-emerald-700" },
  cancelled: { label: "⛔ İptal Edildi", color: "text-rose-600" },
  expired: { label: "❌ Sona Erdi", color: "text-slate-500" },
  paused: { label: "⏸ Duraklatıldı", color: "text-amber-600" },
  past_due: { label: "⚠️ Gecikmiş", color: "text-orange-600" },
  unpaid: { label: "💸 Ödenmedi", color: "text-red-600" },
};

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudioBillingPage() {
  useLemonJS();

  const [tenants, setTenants] = useState<TenantBillingRow[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "OVERDUE">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Global ledger add form
  const [ledgerTenantId, setLedgerTenantId] = useState("");
  const [ledgerType, setLedgerType] = useState<"CHARGE" | "COLLECTION">("CHARGE");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split("T")[0]);
  const [ledgerDueDate, setLedgerDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [addingLedger, setAddingLedger] = useState(false);

  // Checkout generation
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cusRes, rateRes] = await Promise.all([
        fetch("/api/studio/customers"),
        fetch("/api/subscriptions/exchange-rate"),
      ]);
      if (cusRes.ok) {
        const json = await cusRes.json();
        const raw: any[] = json.data || json;
        const rows: TenantBillingRow[] = raw.map((c) => {
          let meta: Record<string, any> = {};
          try { meta = c.notes ? JSON.parse(c.notes) : {}; } catch {}
          const ledger: any[] = meta.billingLedger ?? [];
          const totalCharges = ledger.filter((e) => e.type === "CHARGE").reduce((s, e) => s + Number(e.amount), 0);
          const totalCollections = ledger.filter((e) => e.type === "COLLECTION").reduce((s, e) => s + Number(e.amount), 0);
          const balance = totalCharges - totalCollections;
          const now = new Date();
          const end = new Date(meta.licenseEnd ?? "2099-01-01");
          const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
          const status: TenantBillingRow["status"] = diffDays < 0 ? "EXPIRED" : diffDays <= 30 ? "NEAR_EXPIRY" : "ACTIVE";
          const overdueAmount = ledger.filter((e) => e.type === "CHARGE" && e.status === "UNPAID" && e.dueDate && new Date(e.dueDate) < now).reduce((s, e) => s + Number(e.amount), 0);
          return {
            id: c.id,
            fullName: c.fullName,
            phone: c.phone,
            email: c.email ?? null,
            plan: meta.plan ?? "Pro",
            licenseEnd: meta.licenseEnd ?? "",
            status,
            lsSubscriptionStatus: meta.lsSubscriptionStatus,
            lsRenewsAt: meta.lsRenewsAt,
            lsCurrentPeriodEnd: meta.lsCurrentPeriodEnd,
            lsSubscriptionId: meta.lsSubscriptionId,
            balance,
            overdueAmount,
            totalCharges,
            totalCollections,
            billingLedger: ledger,
          };
        });
        setTenants(rows);
      }
      if (rateRes.ok) setExchangeRate(await rateRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPIs
  const kpis = {
    totalTenants: tenants.length,
    totalReceivable: tenants.reduce((s, t) => s + Math.max(0, t.balance), 0),
    totalOverdue: tenants.reduce((s, t) => s + t.overdueAmount, 0),
    overdueCount: tenants.filter((t) => t.overdueAmount > 0).length,
    lsActive: tenants.filter((t) => t.lsSubscriptionStatus === "active").length,
  };

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = t.fullName.toLowerCase().includes(q) || t.phone.includes(q) || (t.email ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "ALL" ? true :
      statusFilter === "OVERDUE" ? t.overdueAmount > 0 :
      t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleGenerateCheckout = async (tenantId: string, plan: string) => {
    setCheckoutLoading(tenantId);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, plan, cycle: "monthly" }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        openLemonCheckout(json.checkoutUrl);
        toast.success("Ödeme penceresi açıldı");
      } else {
        toast.error(json.error ?? "Checkout oluşturulamadı");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleAddLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerTenantId || !ledgerAmount || !ledgerDesc) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    setAddingLedger(true);
    try {
      const tenant = tenants.find((t) => t.id === ledgerTenantId);
      if (!tenant) throw new Error("Tenant bulunamadı");
      // Fetch full customer details first
      const detRes = await fetch(`/api/studio/customers/${ledgerTenantId}`);
      if (!detRes.ok) throw new Error("Tenant detayları alınamadı");
      const det = await detRes.json();
      let meta: Record<string, any> = {};
      try { meta = det.customer.notes ? JSON.parse(det.customer.notes) : {}; } catch {}
      const newEntry = {
        id: `ledger-${Date.now()}`,
        type: ledgerType,
        category: "LICENSE",
        amount: Number(ledgerAmount),
        description: ledgerDesc,
        date: ledgerDate,
        dueDate: ledgerType === "CHARGE" ? ledgerDueDate : undefined,
        status: ledgerType === "CHARGE" ? "UNPAID" : "PAID",
        sourceModule: "BILLING",
        createdBy: "StudioAdmin",
      };
      meta.billingLedger = [...(meta.billingLedger ?? []), newEntry];
      const res = await fetch(`/api/studio/customers/${ledgerTenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: det.customer.fullName, phone: det.customer.phone, email: det.customer.email, saasMetadata: meta }),
      });
      if (res.ok) {
        toast.success("Cari işlem eklendi");
        setLedgerAmount("");
        setLedgerDesc("");
        await fetchData();
      } else {
        toast.error("Kaydedilemedi");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Hata");
    } finally {
      setAddingLedger(false);
    }
  };

  const handleMarkPaid = async (tenantId: string, entryId: string) => {
    try {
      const detRes = await fetch(`/api/studio/customers/${tenantId}`);
      if (!detRes.ok) throw new Error();
      const det = await detRes.json();
      let meta: Record<string, any> = {};
      try { meta = det.customer.notes ? JSON.parse(det.customer.notes) : {}; } catch {}
      meta.billingLedger = (meta.billingLedger ?? []).map((e: any) =>
        e.id === entryId ? { ...e, status: "PAID", updatedAt: new Date().toISOString() } : e
      );
      const charge = meta.billingLedger.find((e: any) => e.id === entryId);
      if (charge) {
        meta.billingLedger.push({
          id: `col-${Date.now()}`,
          type: "COLLECTION",
          category: charge.category,
          amount: charge.amount,
          description: `Tahsilat: ${charge.description}`,
          date: new Date().toISOString().split("T")[0],
          status: "PAID",
          sourceModule: "BILLING",
          createdBy: "StudioAdmin",
        });
      }
      await fetch(`/api/studio/customers/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: det.customer.fullName, phone: det.customer.phone, email: det.customer.email, saasMetadata: meta }),
      });
      toast.success("Tahsilat kaydedildi");
      await fetchData();
    } catch {
      toast.error("Tahsilat kaydedilemedi");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Finans verileri yükleniyor…</p>
        </div>
      </div>
    );
  }

  const rate = exchangeRate?.usdToTry ?? 38.5;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Finans & Tahsilat</h1>
          <p className="text-slate-500 mt-1 text-sm">Tüm tenant faturaları, LemonSqueezy abonelikleri ve nakit tahsilatlar</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Kur badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-base">💱</span>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-400">USD/TRY</p>
              <p className="text-xs font-black text-slate-900">₺{rate.toFixed(2)}
                <span className={`ml-1 text-[9px] ${exchangeRate?.source === "live" ? "text-emerald-600" : "text-amber-500"}`}>
                  {exchangeRate?.source === "live" ? "● Canlı" : "● Tahmini"}
                </span>
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition">
            ↻ Yenile
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Toplam Tenant", value: kpis.totalTenants.toString(), icon: "🏢", color: "from-slate-500 to-slate-700" },
          { label: "LS Aktif Abonelik", value: kpis.lsActive.toString(), icon: "🍋", color: "from-amber-400 to-orange-500" },
          { label: "Açık Alacak", value: `₺${kpis.totalReceivable.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`, icon: "💰", color: "from-indigo-500 to-indigo-700" },
          { label: "Vadesi Geçen", value: `₺${kpis.totalOverdue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`, icon: "⚠️", color: "from-rose-500 to-rose-700" },
          { label: "Gecikmiş Tenant", value: kpis.overdueCount.toString(), icon: "🔔", color: "from-orange-400 to-red-500" },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className={`bg-gradient-to-br ${k.color} p-4`}>
              <p className="text-2xl">{k.icon}</p>
              <p className="text-xl font-black text-white mt-1">{k.value}</p>
            </div>
            <div className="bg-white px-4 py-2">
              <p className="text-[11px] font-bold text-slate-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Ledger Entry */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <h2 className="text-sm font-black text-slate-900">➕ Manuel Cari İşlem Ekle</h2>
          <p className="text-xs text-slate-500 mt-0.5">Banka havalesi, nakit tahsilat veya manuel borçlandırma</p>
        </div>
        <form onSubmit={handleAddLedger} className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Tenant</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={ledgerTenantId}
              onChange={(e) => setLedgerTenantId(e.target.value)}
            >
              <option value="">— Seçin —</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">İşlem Tipi</label>
            <div className="flex rounded-2xl border border-slate-200 overflow-hidden">
              {(["CHARGE", "COLLECTION"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLedgerType(t)}
                  className={`flex-1 py-2.5 text-xs font-bold transition ${ledgerType === t ? (t === "CHARGE" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white") : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {t === "CHARGE" ? "💸 Borçlandırma" : "💰 Tahsilat"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Tutar (TRY)</label>
            <input
              type="number"
              min="1"
              placeholder="Örn: 1500"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={ledgerAmount}
              onChange={(e) => setLedgerAmount(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Açıklama</label>
            <input
              type="text"
              placeholder="Ödeme açıklaması…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={ledgerDesc}
              onChange={(e) => setLedgerDesc(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addingLedger}
              className="w-full rounded-2xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addingLedger ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Ekleniyor…</> : "✅ Ekle"}
            </button>
          </div>
        </form>
      </div>

      {/* Tenant List */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header / filters */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <h2 className="text-sm font-black text-slate-900 shrink-0">Tenant Fatura Listesi</h2>
          <div className="flex-1 flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="İsim, telefon, e-posta…"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1">
              {(["ALL", "ACTIVE", "NEAR_EXPIRY", "EXPIRED", "OVERDUE"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${statusFilter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {f === "ALL" ? "Tümü" : f === "ACTIVE" ? "Aktif" : f === "NEAR_EXPIRY" ? "Yakında" : f === "EXPIRED" ? "Doldu" : "Vadesi Geçen"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 shrink-0">{filtered.length} kayıt</p>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold">Sonuç bulunamadı</p>
            </div>
          )}

          {filtered.map((t) => {
            const isExpanded = expandedId === t.id;
            const unpaidEntries = t.billingLedger.filter((e) => e.type === "CHARGE" && e.status === "UNPAID");

            return (
              <div key={t.id}>
                {/* Row */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? "bg-indigo-50/50" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  {/* Tenant info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shrink-0">
                      {t.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{t.fullName}</p>
                      <p className="text-[10px] text-slate-500">{t.plan} · {t.licenseEnd ? `Bitiş: ${t.licenseEnd}` : "—"}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-xl border px-2 py-0.5 text-[10px] font-bold ${STATUS_CONFIG[t.status].bg}`}>
                      {STATUS_CONFIG[t.status].label}
                    </span>
                    {t.lsSubscriptionStatus && (
                      <span className={`text-[10px] font-bold ${LS_STATUS_CONFIG[t.lsSubscriptionStatus]?.color ?? "text-slate-500"}`}>
                        {LS_STATUS_CONFIG[t.lsSubscriptionStatus]?.label ?? t.lsSubscriptionStatus}
                      </span>
                    )}
                    {t.overdueAmount > 0 && (
                      <span className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 animate-pulse">
                        ⚠ ₺{t.overdueAmount.toLocaleString()} Vadesi Geçti
                      </span>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${t.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {t.balance > 0 ? "+" : ""}₺{Math.abs(t.balance).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10px] text-slate-400">{t.balance > 0 ? "Alacak" : t.balance < 0 ? "Fazla Ödeme" : "Dengede"}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleGenerateCheckout(t.id, t.plan)}
                      disabled={checkoutLoading === t.id}
                      className="flex items-center gap-1.5 rounded-2xl bg-amber-400 hover:bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-amber-950 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                      title="LemonSqueezy ödeme penceresi aç"
                    >
                      {checkoutLoading === t.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
                      ) : "🍋"}
                      Ödeme Al
                    </button>
                    <span className="text-slate-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-6 pb-6 bg-slate-50 border-t border-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                      {/* Summary */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Finansal Özet</h4>
                        <div className="space-y-2">
                          {[
                            { label: "Toplam Borçlandırma", value: `₺${t.totalCharges.toLocaleString()}`, color: "text-rose-600" },
                            { label: "Toplam Tahsilat", value: `₺${t.totalCollections.toLocaleString()}`, color: "text-emerald-600" },
                            { label: "Net Bakiye", value: `₺${t.balance.toLocaleString()}`, color: t.balance > 0 ? "text-rose-600" : "text-emerald-600" },
                          ].map((item) => (
                            <div key={item.label} className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">{item.label}</span>
                              <span className={`text-xs font-black ${item.color}`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                        {t.lsRenewsAt && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400">Sonraki LS ödemesi</p>
                            <p className="text-xs font-bold text-slate-700">{new Date(t.lsRenewsAt).toLocaleDateString("tr-TR")}
                              <span className="ml-1 text-emerald-600">({daysUntil(t.lsRenewsAt)} gün)</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Unpaid invoices */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Bekleyen Faturalar ({unpaidEntries.length})</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {unpaidEntries.length === 0 ? (
                            <p className="text-xs text-slate-400">Ödeme bekleyen fatura yok ✅</p>
                          ) : (
                            unpaidEntries.map((e) => (
                              <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-100 p-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{e.description}</p>
                                  <p className="text-[10px] text-slate-400">{e.dueDate ? `Vade: ${e.dueDate}` : e.date}</p>
                                </div>
                                <div className="shrink-0 flex items-center gap-1.5">
                                  <span className="text-xs font-black text-rose-700">₺{Number(e.amount).toLocaleString()}</span>
                                  <button
                                    onClick={() => handleMarkPaid(t.id, e.id)}
                                    className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-200 transition"
                                  >
                                    Tahsil Et
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Full ledger */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Son İşlemler</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {t.billingLedger.length === 0 ? (
                            <p className="text-xs text-slate-400">İşlem kaydı yok</p>
                          ) : (
                            [...t.billingLedger].reverse().slice(0, 10).map((e) => (
                              <div key={e.id} className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-bold ${e.type === "COLLECTION" ? "text-emerald-600" : "text-rose-600"}`}>
                                  {e.type === "COLLECTION" ? "▲" : "▼"}
                                </span>
                                <span className="flex-1 text-[10px] text-slate-600 truncate">{e.description}</span>
                                <span className={`text-[10px] font-black shrink-0 ${e.type === "COLLECTION" ? "text-emerald-600" : "text-rose-600"}`}>
                                  {e.type === "COLLECTION" ? "+" : "-"}₺{Number(e.amount).toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
