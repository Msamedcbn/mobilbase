"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PLAN_NAME, PLAN_PRICE_TRY, ANNUAL_DISCOUNT_PCT, type BillingCycle } from "@/lib/subscription-plans";
import { useConfirm } from "@/components/confirm-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Dahili "plan" etiketleri — manuel tenant yönetimi ve destek seviyesi
 * kategorizasyonu için kullanılır (app/studio/page.tsx). Gerçek Polar
 * self-servis aboneliği artık tek fiyat/tek plandır (@/lib/subscription-plans);
 * bu etiketler onunla bire bir eşleşmez.
 */
type LegacyPlan = "Lite" | "Service" | "Pro" | "Enterprise";

interface PricingData {
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
  features: Record<
    LegacyPlan,
    { pos: boolean; repairs: boolean; stock: boolean; invoicing: boolean; buyback: boolean; supportLevel: string }
  >;
  history?: Array<{
    id: string;
    createdAt: string;
    createdBy: string;
    reason: string;
    snapshot: Record<string, any>;
  }>;
}

const LEGACY_PLANS: LegacyPlan[] = ["Lite", "Service", "Pro", "Enterprise"];

const PLAN_COLORS: Record<LegacyPlan, string> = {
  Lite: "from-slate-500 to-slate-700",
  Service: "from-blue-500 to-blue-700",
  Pro: "from-indigo-500 to-indigo-700",
  Enterprise: "from-violet-500 to-violet-700",
};

const PLAN_BORDER: Record<LegacyPlan, string> = {
  Lite: "border-slate-200",
  Service: "border-blue-200",
  Pro: "border-indigo-200",
  Enterprise: "border-violet-200",
};

const FEATURES = [
  { key: "pos", label: "POS Sistemi" },
  { key: "repairs", label: "Teknik Servis" },
  { key: "stock", label: "Stok Yönetimi" },
  { key: "invoicing", label: "Fatura Modülü" },
  { key: "buyback", label: "Buyback / Geri Alım" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [editMode, setEditMode] = useState(false);
  const [editPricing, setEditPricing] = useState<PricingData | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [activeSection, setActiveSection] = useState<"plans" | "addons" | "history" | "polar-setup">("plans");

  // Polar ürün ID durumu (env'den gelir, UI'da gösterilir) — tek plan, 2 ürün (aylık/yıllık)
  const [polarProducts] = useState<Record<BillingCycle, string>>({
    monthly: process.env.NEXT_PUBLIC_POLAR_PRODUCT_MONTHLY ?? "",
    annual: process.env.NEXT_PUBLIC_POLAR_PRODUCT_ANNUAL ?? "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/studio/pricing");
      if (pRes.ok) {
        const p = await pRes.json();
        setPricing(p);
        setEditPricing(JSON.parse(JSON.stringify(p)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!editPricing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/studio/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editPricing,
          reason: changeReason || "Fiyatlandırma güncellemesi",
          actor: "StudioAdmin",
        }),
      });
      if (res.ok) {
        toast.success("Fiyatlandırma başarıyla güncellendi");
        setEditMode(false);
        setChangeReason("");
        await fetchData();
      } else {
        toast.error("Kaydetme başarısız");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (historyId: string) => {
    if (!(await confirm("Bu geçmiş kaydına göre fiyatlandırma geri alınsın mı?"))) return;
    try {
      const res = await fetch("/api/studio/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId, actor: "StudioAdmin" }),
      });
      if (res.ok) {
        toast.success("Fiyatlandırma geri alındı");
        await fetchData();
      } else {
        toast.error("Geri alma başarısız");
      }
    } catch {
      toast.error("Bağlantı hatası");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Fiyatlandırma yükleniyor…</p>
        </div>
      </div>
    );
  }

  const p = editMode ? editPricing! : pricing!;
  if (!p) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Paket & Fiyatlandırma</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Plan özellikleri, TL fiyatları ve Polar entegrasyon ayarları
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Edit toggle */}
          {!editMode ? (
            <button
              onClick={() => { setEditMode(true); setActiveSection("plans"); }}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              ✏️ Düzenle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditMode(false); setEditPricing(JSON.parse(JSON.stringify(pricing))); }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Kaydediliyor…</> : "✅ Kaydet"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["monthly", "annual"] as BillingCycle[]).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={`relative rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                billingCycle === cycle
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {cycle === "monthly" ? "Aylık" : "Yıllık"}
              {cycle === "annual" && (
                <span className={`ml-1.5 text-[10px] font-black ${billingCycle === "annual" ? "text-indigo-200" : "text-emerald-600"}`}>
                  −{ANNUAL_DISCOUNT_PCT}%
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Polar yıllık planı %{ANNUAL_DISCOUNT_PCT} indirimlidir. TL üzerinden fatura edilir.
        </p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(["plans", "addons", "history", "polar-setup"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSection === tab
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab === "plans" ? "📦 Planlar" : tab === "addons" ? "➕ Eklentiler" : tab === "history" ? "📋 Geçmiş" : "🔗 Polar"}
          </button>
        ))}
      </div>

      {/* ── PLANS SECTION ── */}
      {activeSection === "plans" && (
        <div className="space-y-6">
          {/* Tek Polar planı — gerçek self-servis fiyatı */}
          <div className="rounded-3xl border-2 border-indigo-200 bg-white shadow-sm">
            <div className="rounded-t-[22px] bg-gradient-to-br from-indigo-500 to-violet-600 p-6">
              <p className="text-sm font-black uppercase tracking-widest text-white/70">{PLAN_NAME} — Polar Self-Servis Planı</p>
              <div className="mt-2">
                <span className="text-4xl font-black text-white">₺{PLAN_PRICE_TRY[billingCycle].toLocaleString("tr-TR")}</span>
                <span className="text-sm font-bold text-white/70"> / {billingCycle === "monthly" ? "ay" : "yıl"}</span>
              </div>
              <p className="mt-2 text-[11px] font-bold text-white/80">Tüm özellikler dahil — POS, stok, teknik servis, faturalama, ikinci el. Bu değer koddan (@/lib/subscription-plans) gelir, buradan düzenlenemez.</p>
            </div>
            <div className="p-6 flex flex-wrap gap-3">
              {FEATURES.map((f) => (
                <span key={f.key} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  ✓ {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Dahili plan etiketleri — manuel tenant yönetimi (app/studio/page.tsx) */}
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1">Dahili Plan Etiketleri</h3>
            <p className="text-xs text-slate-500 mb-4">Manuel tenant oluşturma ve destek seviyesi kategorizasyonu için kullanılır — gerçek Polar fiyatıyla bağlantılı değildir.</p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {LEGACY_PLANS.map((plan) => (
                <div
                  key={plan}
                  className={`relative rounded-3xl border-2 bg-white shadow-sm transition-shadow hover:shadow-lg ${PLAN_BORDER[plan]}`}
                >
                  <div className={`rounded-t-[22px] bg-gradient-to-br ${PLAN_COLORS[plan]} p-5`}>
                    <p className="text-sm font-black uppercase tracking-widest text-white/70">{plan}</p>
                  </div>

                  {/* Features */}
                  <div className="p-5 space-y-3">
                    {FEATURES.map((f) => {
                      const enabled = p.features?.[plan]?.[f.key as keyof typeof p.features.Pro] ?? false;
                      return (
                        <div key={f.key} className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">{f.label}</span>
                          {editMode ? (
                            <button
                              onClick={() => {
                                if (!editPricing) return;
                                setEditPricing({
                                  ...editPricing,
                                  features: {
                                    ...editPricing.features,
                                    [plan]: {
                                      ...(editPricing.features[plan] || {}),
                                      [f.key]: !editPricing.features[plan]?.[f.key as keyof typeof editPricing.features.Pro],
                                    },
                                  },
                                });
                              }}
                              className={`h-6 w-6 rounded-lg text-xs font-black transition ${
                                enabled ? "bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600" : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700"
                              }`}
                            >
                              {enabled ? "✓" : "✗"}
                            </button>
                          ) : (
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-black ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-300"}`}>
                              {enabled ? "✓" : "✗"}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {/* Support level */}
                    <div className="pt-3 border-t border-slate-100">
                      {editMode ? (
                        <input
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={editPricing?.features[plan]?.supportLevel ?? ""}
                          onChange={(e) => {
                            if (!editPricing) return;
                            setEditPricing({
                              ...editPricing,
                              features: {
                                ...editPricing.features,
                                [plan]: { ...(editPricing.features[plan] || { pos: false, repairs: false, stock: false, invoicing: false, buyback: false, supportLevel: "" }), supportLevel: e.target.value },
                              },
                            });
                          }}
                        />
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-500">{p.features?.[plan]?.supportLevel}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Branch & MRR simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branch surcharge */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4">Şube Fiyatlandırması</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600">Ücretsiz şube limiti</span>
                  {editMode ? (
                    <input
                      type="number"
                      min={1}
                      className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editPricing?.freeBranchLimit ?? p.freeBranchLimit}
                      onChange={(e) => setEditPricing({ ...editPricing!, freeBranchLimit: Number(e.target.value) })}
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900">{p.freeBranchLimit} şube</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600">Ek şube / ay (TRY)</span>
                  {editMode ? (
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded-xl border border-slate-200 px-2 py-1 text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={editPricing?.branchSurchargePrice ?? p.branchSurchargePrice}
                      onChange={(e) => setEditPricing({ ...editPricing!, branchSurchargePrice: Number(e.target.value) })}
                    />
                  ) : (
                    <span className="text-sm font-black text-slate-900">₺{p.branchSurchargePrice.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* MRR Simulator */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-4">💡 MRR Simülatörü</h3>
              <MrrSimulator cycle={billingCycle} />
            </div>
          </div>

          {/* Change reason (edit mode) */}
          {editMode && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <label className="block text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                Değişiklik nedeni (opsiyonel)
              </label>
              <input
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Örn: Q3 fiyat revizyonu"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── ADDONS SECTION ── */}
      {activeSection === "addons" && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Eklenti Fiyatları</h2>
            <p className="text-xs text-slate-500 mt-1">API paketi, veritabanı genişletme ve özel geliştirme ücretleri</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "apiPackPrice", label: "API Paketi (aylık)", unit: "TRY" },
              { key: "dbGbPrice", label: "Ek DB alanı / GB (aylık)", unit: "TRY" },
              { key: "customDevHourly", label: "Özel Geliştirme (saatlik)", unit: "TRY" },
              { key: "annualDiscountPct", label: "Yıllık İndirim", unit: "%" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-[10px] text-slate-500">{item.unit}</p>
                </div>
                {editMode ? (
                  <input
                    type="number"
                    min={0}
                    className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={editPricing?.addons?.[item.key as keyof typeof editPricing.addons] ?? 0}
                    onChange={(e) =>
                      setEditPricing({
                        ...editPricing!,
                        addons: { ...editPricing!.addons!, [item.key]: Number(e.target.value) },
                      })
                    }
                  />
                ) : (
                  <span className="text-lg font-black text-slate-900">
                    {item.unit === "%" ? "" : item.unit === "TRY" ? "₺" : ""}
                    {(p.addons?.[item.key as keyof typeof p.addons] ?? 0).toLocaleString()}
                    {item.unit === "%" ? "%" : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY SECTION ── */}
      {activeSection === "history" && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Fiyatlandırma Geçmişi</h2>
            <p className="text-xs text-slate-500 mt-1">Tüm fiyat değişiklik kayıtları</p>
          </div>
          <div className="divide-y divide-slate-100">
            {(!pricing?.history || pricing.history.length === 0) ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold">Henüz değişiklik kaydı yok</p>
              </div>
            ) : (
              pricing.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-lg">📝</div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{h.reason}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(h.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{h.createdBy}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {LEGACY_PLANS.map((pl) => (
                          <span key={pl} className="text-[10px] font-bold text-slate-500">
                            {pl}: ₺{Number((h.snapshot as any)?.[pl] ?? 0).toLocaleString("tr-TR")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevert(h.id)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                  >
                    Geri Al
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── POLAR SETUP SECTION ── */}
      {activeSection === "polar-setup" && (
        <div className="space-y-6">
          <div className="rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🔗</span>
              <div>
                <h3 className="font-black text-indigo-900">Polar Kurulum Kılavuzu</h3>
                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                  Ödeme sistemini aktifleştirmek için aşağıdaki adımları takip edin.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { step: "1", title: "Polar organizasyon onayını tamamlayın", desc: "VibeGSM organizasyonu oluşturuldu ama ödeme kabulü için KYC/hesap onayı henüz tamamlanmadı", action: "Polar Dashboard →", url: "https://polar.sh/dashboard" },
              { step: "2", title: "Organization Access Token oluşturun", desc: "Settings → Developers → yeni bir Organization Access Token oluşturun", action: "Settings →", url: "https://polar.sh/dashboard" },
              { step: "3", title: ".env dosyasını doldurun", desc: "POLAR_ACCESS_TOKEN değerini ekleyin — ürün ID'leri ve webhook secret zaten oluşturuldu", action: null, url: null },
              { step: "4", title: "Webhook secret'ı Standard Webhooks'a geçtikten sonra yenileyin", desc: "8 Eylül 2026 00:00 UTC sonrası webhook secret'ı bir kez daha yenileyip POLAR_WEBHOOK_SECRET'ı güncelleyin", action: "Webhooks →", url: "https://polar.sh/dashboard" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                {item.action && item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    {item.action}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Current product IDs status */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4">Ürün ID Durumu — {PLAN_NAME} (tek plan)</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["monthly", "annual"] as BillingCycle[]).map((c) => {
                const vid = polarProducts[c];
                return (
                  <div key={c} className={`flex items-center justify-between rounded-2xl p-3 ${vid ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
                    <span className="text-xs font-bold text-slate-700">{c === "monthly" ? "Aylık" : "Yıllık"}</span>
                    <span className={`text-[10px] font-mono font-bold ${vid ? "text-emerald-700" : "text-rose-600"}`}>
                      {vid ? "✅ Ayarlı" : "❌ Eksik"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

// ─── MRR Simulator ────────────────────────────────────────────────────────────

function MrrSimulator({ cycle }: { cycle: BillingCycle }) {
  const [count, setCount] = useState(25);

  const price = PLAN_PRICE_TRY[cycle];
  const total = price * count;
  const mrr = cycle === "annual" ? total / 12 : total;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-600 w-24">Abone sayısı</span>
        <input
          type="range"
          min={0}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="flex-1 accent-indigo-600"
        />
        <span className="text-xs font-black text-slate-900 w-8 text-right">{count}</span>
      </div>
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Tahmini Aylık Gelir (MRR)</p>
        <p className="text-2xl font-black">₺{mrr.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
        {cycle === "annual" && (
          <p className="text-[10px] text-indigo-300 mt-1">Yıllık toplam tahsilat: ₺{total.toLocaleString("tr-TR")} ({count} abone × ₺{price.toLocaleString("tr-TR")})</p>
        )}
      </div>
    </div>
  );
}
