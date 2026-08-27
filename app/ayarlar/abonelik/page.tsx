"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PLAN_USD_PRICES, ANNUAL_DISCOUNT_PCT, type LsPlan, type LsBillingCycle } from "@/lib/subscription-plans";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionInfo {
  plan: LsPlan;
  licenseStart: string;
  licenseEnd: string;
  branchLimit: number;
  smsQuota: number;
  smsUsed: number;
  lsSubscriptionId?: string;
  lsSubscriptionStatus?: string;
  lsRenewsAt?: string;
  lsCurrentPeriodEnd?: string;
  lsProductName?: string;
  isFrozen?: boolean;
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
  modules: {
    pos: boolean;
    repairs: boolean;
    stock: boolean;
    buyback: boolean;
    invoicing: boolean;
  };
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

// ─── Lemon.js Embed Loader ────────────────────────────────────────────────────

function useLemonJS() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || typeof window === "undefined") return;
    const existing = document.querySelector('script[src*="lemon.js"]');
    if (existing) { loaded.current = true; return; }
    const script = document.createElement("script");
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => window.createLemonSqueezy?.();
    document.head.appendChild(script);
    loaded.current = true;
  }, []);
}

function openEmbedCheckout(url: string, onClose?: () => void) {
  const embedUrl = url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Setup({
      eventHandler: (event: any) => {
        if (event?.event === "Checkout.Success" || event?.event === "PaymentMethodUpdate.Closed") {
          onClose?.();
        }
      },
    });
    window.LemonSqueezy.Url.Open(embedUrl);
  } else {
    // Fallback: yeni sekmede aç
    window.open(embedUrl, "_blank");
  }
}

// ─── Plan constants ───────────────────────────────────────────────────────────

const PLANS: LsPlan[] = ["Lite", "Service", "Pro", "Enterprise"];

const PLAN_FEATURES: Record<LsPlan, { label: string; color: string; gradient: string; description: string }> = {
  Lite: {
    label: "Lite",
    color: "text-slate-700",
    gradient: "from-slate-400 to-slate-600",
    description: "Küçük işletmeler için temel özellikler",
  },
  Service: {
    label: "Service",
    color: "text-blue-700",
    gradient: "from-blue-400 to-blue-700",
    description: "Teknik servis odaklı işletmeler için",
  },
  Pro: {
    label: "Pro",
    color: "text-indigo-700",
    gradient: "from-indigo-500 to-indigo-700",
    description: "Çok şubeli profesyonel işletmeler için",
  },
  Enterprise: {
    label: "Enterprise",
    color: "text-violet-700",
    gradient: "from-violet-500 to-violet-700",
    description: "Zincir mağazalar ve kurumsal yapılar için",
  },
};

const MODULE_LABELS: Record<keyof SubscriptionInfo["modules"], string> = {
  pos: "POS Sistemi",
  repairs: "Teknik Servis",
  stock: "Stok Yönetimi",
  buyback: "Geri Alım (Buyback)",
  invoicing: "Faturalama",
};

const LS_STATUS: Record<string, { label: string; badge: string }> = {
  active: { label: "Aktif Abonelik", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "İptal Edildi", badge: "bg-rose-100 text-rose-800 border-rose-200" },
  expired: { label: "Sona Erdi", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  paused: { label: "Duraklatıldı", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  past_due: { label: "Ödeme Gecikti", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  unpaid: { label: "Ödenmedi", badge: "bg-rose-100 text-rose-800 border-rose-200" },
};

// ─── Icons (inline, Heroicons-outline style) ──────────────────────────────────

function IconLock(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconCalendar(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}
function IconRefresh(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
function IconGear(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function IconList(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconTrendUp(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}
function IconDocument(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}
function IconCheckCircle(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}
function IconCheck(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconX(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function IconArrowUp(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}
function IconArrowDown(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
function IconBanknote(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 10v.01M18 14v.01" />
    </svg>
  );
}
function IconReceipt(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2Z" />
      <path d="M8 8h8M8 12h8" />
    </svg>
  );
}
function IconInfo(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function daysLeft(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AbonelikPage() {
  useLemonJS();

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<LsBillingCycle>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<LsPlan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<LsPlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "history">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, rateRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/subscriptions/exchange-rate"),
      ]);
      if (meRes.ok) {
        const meJson = await meRes.json();
        const tenantId = meJson?.user?.tenantId;
        if (tenantId) {
          const detRes = await fetch(`/api/studio/customers/${tenantId}`);
          if (detRes.ok) {
            const det = await detRes.json();
            let meta: Record<string, any> = {};
            try { meta = det.customer?.notes ? JSON.parse(det.customer.notes) : {}; } catch {}
            setInfo({
              plan: meta.plan ?? "Pro",
              licenseStart: meta.licenseStart ?? "",
              licenseEnd: meta.licenseEnd ?? "",
              branchLimit: meta.branchLimit ?? 5,
              smsQuota: meta.smsQuota ?? 0,
              smsUsed: meta.smsUsed ?? 0,
              lsSubscriptionId: meta.lsSubscriptionId,
              lsSubscriptionStatus: meta.lsSubscriptionStatus,
              lsRenewsAt: meta.lsRenewsAt,
              lsCurrentPeriodEnd: meta.lsCurrentPeriodEnd,
              lsProductName: meta.lsProductName,
              isFrozen: meta.isFrozen ?? false,
              billingLedger: meta.billingLedger ?? [],
              modules: {
                pos: meta.modules?.pos ?? true,
                repairs: meta.modules?.repairs ?? true,
                stock: meta.modules?.stock ?? false,
                buyback: meta.modules?.buyback ?? false,
                invoicing: meta.modules?.invoicing ?? false,
              },
            });
          }
        }
      }
      if (rateRes.ok) setExchangeRate(await rateRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Also refresh after checkout success (URL param)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("success=1")) {
      toast.success("Ödeme başarıyla tamamlandı! Aboneliğiniz güncelleniyor…");
      setTimeout(fetchData, 3000);
    }
  }, [fetchData]);

  const handleCheckout = async (plan: LsPlan) => {
    setCheckoutLoading(plan);
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle: billingCycle }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        openEmbedCheckout(json.checkoutUrl, () => {
          toast.success("Ödeme tamamlandı!");
          setTimeout(fetchData, 2000);
        });
      } else {
        toast.error(json.error ?? "Checkout oluşturulamadı");
        if (json.hint) toast.info(json.hint, { duration: 6000 });
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setCheckoutLoading(null);
      setCheckoutPlan(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscriptions/portal");
      const json = await res.json();
      if (res.ok && json.portalUrl) {
        openEmbedCheckout(json.portalUrl);
      } else if (json.noSubscription) {
        toast.info("Henüz aktif bir LemonSqueezy aboneliğiniz yok");
      } else {
        toast.error(json.error ?? "Portal açılamadı");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Abonelik bilgileri yükleniyor…</p>
        </div>
      </div>
    );
  }

  const rate = exchangeRate?.usdToTry ?? 38.5;
  const plan = info?.plan ?? "Pro";
  const features = PLAN_FEATURES[plan as LsPlan] ?? PLAN_FEATURES.Pro;
  const lsStatus = info?.lsSubscriptionStatus;
  const lsStatusConf = lsStatus ? LS_STATUS[lsStatus] : null;
  const renewalDays = info?.lsRenewsAt ? daysLeft(info.lsRenewsAt) : null;
  const licenseDays = info?.licenseEnd ? daysLeft(info.licenseEnd) : null;
  const currentUsd = PLAN_USD_PRICES[plan as LsPlan]?.[billingCycle] ?? 49;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Abonelik Yönetimi</h1>
        <p className="text-slate-500 mt-1 text-sm">Planınızı görüntüleyin, yükseltin veya iptal edin</p>
      </div>

      {/* Frozen alert */}
      {info?.isFrozen && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-6 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <IconLock className="w-5 h-5" />
          </span>
          <div>
            <p className="font-black text-rose-900">Hesabınız Dondurulmuştur</p>
            <p className="text-sm text-rose-700 mt-0.5">Aboneliğiniz sona ermiş veya ödemeniz gecikmiş. Hizmete devam etmek için lütfen ödeme yapın.</p>
          </div>
          <button
            onClick={() => handleCheckout(plan as LsPlan)}
            className="ml-auto shrink-0 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-rose-700 active:scale-95 transition-all"
          >
            Şimdi Öde
          </button>
        </div>
      )}

      {/* Current plan hero */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 shadow-xl text-white">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-600" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/20 translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Mevcut Planınız</p>
            <h2 className="text-4xl font-black mt-1">{plan}</h2>
            <p className="text-slate-400 text-sm mt-2">{features.description}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {lsStatusConf && (
                <span className={`rounded-xl border px-3 py-1 text-xs font-bold ${lsStatusConf.badge}`}>
                  {lsStatusConf.label}
                </span>
              )}
              {info?.licenseEnd && (
                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${
                  licenseDays !== null && licenseDays < 0 ? "bg-rose-100 text-rose-800 border-rose-200"
                  : licenseDays !== null && licenseDays <= 30 ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-white/10 text-white border-white/20"
                }`}>
                  <IconCalendar className="w-3.5 h-3.5" />
                  Bitiş: <span className="font-mono">{new Date(info.licenseEnd).toLocaleDateString("tr-TR")}</span>
                  {licenseDays !== null && licenseDays >= 0 && <span className="font-mono">({licenseDays} gün)</span>}
                </span>
              )}
              {renewalDays !== null && renewalDays >= 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  <IconRefresh className="w-3.5 h-3.5" />
                  Yenileme: <span className="font-mono">{renewalDays} gün</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Price display */}
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl font-black font-mono">${currentUsd}</span>
                <span className="text-sm font-bold text-slate-400">/ay</span>
              </div>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-sm font-bold text-slate-300 font-mono">
                  ≈ ₺{(currentUsd * rate).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">(1$ = ₺{rate.toFixed(2)})</span>
                {exchangeRate?.source === "live" && (
                  <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">● Canlı Kur</span>
                )}
              </div>
            </div>

            {/* Portal button */}
            {info?.lsSubscriptionId && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 px-5 py-2.5 text-sm font-bold text-white active:scale-95 transition-all disabled:opacity-50"
              >
                {portalLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <IconGear className="w-4 h-4" />}
                Aboneliği Yönet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(["overview", "plans", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold transition-all ${
              activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab === "overview" ? <IconList className="w-3.5 h-3.5" /> : tab === "plans" ? <IconTrendUp className="w-3.5 h-3.5" /> : <IconDocument className="w-3.5 h-3.5" />}
            {tab === "overview" ? "Genel Bakış" : tab === "plans" ? "Plan Değiştir" : "Fatura Geçmişi"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && info && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active modules */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4">Aktif Modüller</h3>
            <div className="space-y-3">
              {(Object.keys(info.modules) as Array<keyof typeof info.modules>).map((mod) => (
                <div key={mod} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{MODULE_LABELS[mod]}</span>
                  <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${
                    info.modules[mod] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {info.modules[mod] ? <IconCheck className="w-3.5 h-3.5" /> : <IconX className="w-3.5 h-3.5" />}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quota & limits */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4">Kota ve Limitler</h3>
            <div className="space-y-4">
              {/* Branch limit */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                  <span>Şube Limiti</span>
                  <span className="text-slate-900 font-mono">{info.branchLimit} şube</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600 w-3/4" />
                </div>
              </div>

              {/* SMS quota */}
              {info.smsQuota > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>SMS Kotası</span>
                    <span className="text-slate-900 font-mono">{info.smsUsed.toLocaleString()} / {info.smsQuota.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, (info.smsUsed / info.smsQuota) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* License period */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                {[
                  { label: "Lisans Başlangıcı", value: info.licenseStart ? new Date(info.licenseStart).toLocaleDateString("tr-TR") : "—" },
                  { label: "Lisans Bitişi", value: info.licenseEnd ? new Date(info.licenseEnd).toLocaleDateString("tr-TR") : "—" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="font-bold text-slate-900 font-mono">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          {/* Billing cycle toggle */}
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {(["monthly", "annual"] as LsBillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`relative rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                    billingCycle === cycle ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {cycle === "monthly" ? "Aylık" : "Yıllık"}
                  {cycle === "annual" && (
                    <span className={`ml-2 text-[10px] font-black font-mono ${billingCycle === "annual" ? "text-blue-200" : "text-emerald-600"}`}>
                      −{ANNUAL_DISCOUNT_PCT}%
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Fiyatlar USD cinsinden — anlık kur ile TRY karşılığı gösterilir
            </p>
          </div>

          {/* Plan grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => {
              const usd = PLAN_USD_PRICES[p][billingCycle];
              const tryPrice = usd * rate;
              const isCurrent = p === plan;
              const pConf = PLAN_FEATURES[p];

              const isUpgrade = PLANS.indexOf(p) > PLANS.indexOf(plan as LsPlan);

              return (
                <div
                  key={p}
                  className={`relative rounded-2xl border-2 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-shadow ${
                    isCurrent ? "border-blue-400 ring-2 ring-blue-200 ring-offset-1" : "border-slate-200"
                  }`}
                >
                  {isCurrent && (
                    <div
                      className="absolute top-0 left-0 right-0 py-1 text-center text-[10px] font-black uppercase tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg, var(--accent, #3b82f6) 0%, #2563eb 100%)", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
                    >
                      Mevcut Planınız
                    </div>
                  )}

                  <div className={`bg-slate-900 ${isCurrent ? "pt-8" : "pt-5"} pb-5 px-5`}>
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">{p}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">${usd}</span>
                      <span className="text-xs font-bold text-slate-400">/ay</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      ≈ ₺{tryPrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} / ay
                    </p>
                  </div>

                  <div className="p-5">
                    <p className="text-[11px] font-semibold text-slate-500 mb-4">{pConf.description}</p>

                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-center text-xs font-bold text-blue-700">
                        <IconCheckCircle className="w-3.5 h-3.5" />
                        Aktif Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(p)}
                        disabled={checkoutLoading !== null}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {checkoutLoading === p ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Açılıyor…
                          </span>
                        ) : (
                          <>
                            {isUpgrade ? <IconArrowUp className="w-3.5 h-3.5" /> : <IconArrowDown className="w-3.5 h-3.5" />}
                            {isUpgrade ? "Yükselt" : "Değiştir"} — {p}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Embed note */}
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <IconInfo className="w-4 h-4" />
            </span>
            <p className="text-xs text-amber-800 font-medium">
              Ödeme penceresi <strong>uygulama içinde açılır</strong> — LemonSqueezy güvenli ödeme sistemi.
              Kredi kartı, PayPal ve daha fazlası. USD olarak tahsil edilir; fatura kesilinceye kadar anlık kur bilgisi için danışın.
            </p>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === "history" && info && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Fatura ve Ödeme Geçmişi</h3>
            <span className="text-xs text-slate-400 font-mono">{info.billingLedger.length} kayıt</span>
          </div>
          <div className="divide-y divide-slate-100">
            {info.billingLedger.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <IconDocument className="w-9 h-9 mx-auto mb-3 opacity-60" />
                <p className="font-semibold">Henüz fatura kaydı yok</p>
              </div>
            ) : (
              [...info.billingLedger].reverse().map((entry) => (
                <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    entry.type === "COLLECTION" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {entry.type === "COLLECTION" ? <IconBanknote className="w-5 h-5" /> : <IconReceipt className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{entry.description}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(entry.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                      {entry.dueDate && ` · Vade: ${new Date(entry.dueDate).toLocaleDateString("tr-TR")}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black font-mono ${entry.type === "COLLECTION" ? "text-emerald-600" : "text-slate-900"}`}>
                      {entry.type === "COLLECTION" ? "+" : ""}₺{Number(entry.amount).toLocaleString()}
                    </p>
                    {entry.status && (
                      <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold mt-0.5 ${
                        entry.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {entry.status === "PAID" ? "Ödendi" : "Bekliyor"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
