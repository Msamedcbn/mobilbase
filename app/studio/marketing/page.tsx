"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignPlacement = "banner" | "modal";

interface Campaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
  placement: CampaignPlacement;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type DiscountType = "percent" | "fixed";

interface ReferralCode {
  id: string;
  code: string;
  ownerName: string;
  discountType: DiscountType;
  discountValue: number;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_CAMPAIGN_FORM = {
  title: "",
  subtitle: "",
  badge: "",
  ctaText: "",
  ctaHref: "",
  placement: "banner" as CampaignPlacement,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

const EMPTY_CODE_FORM = {
  code: "",
  ownerName: "",
  discountType: "percent" as DiscountType,
  discountValue: "",
  usageLimit: "",
  notes: "",
  isActive: true,
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isLive(c: Campaign): boolean {
  const now = Date.now();
  if (!c.isActive) return false;
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { confirm, confirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<"campaigns" | "referrals">("campaigns");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [codes, setCodes] = useState<ReferralCode[]>([]);

  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [savingCampaign, setSavingCampaign] = useState(false);

  const [codeFormOpen, setCodeFormOpen] = useState(false);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [codeForm, setCodeForm] = useState(EMPTY_CODE_FORM);
  const [savingCode, setSavingCode] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        fetch("/api/studio/campaigns"),
        fetch("/api/studio/referral-codes"),
      ]);
      if (cRes.ok) setCampaigns((await cRes.json()).campaigns ?? []);
      if (rRes.ok) setCodes((await rRes.json()).codes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Campaigns ──

  const openNewCampaign = () => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignFormOpen(true);
  };

  const openEditCampaign = (c: Campaign) => {
    setEditingCampaignId(c.id);
    setCampaignForm({
      title: c.title,
      subtitle: c.subtitle,
      badge: c.badge,
      ctaText: c.ctaText,
      ctaHref: c.ctaHref,
      placement: c.placement,
      isActive: c.isActive,
      startsAt: toDatetimeLocal(c.startsAt),
      endsAt: toDatetimeLocal(c.endsAt),
    });
    setCampaignFormOpen(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.title.trim() || !campaignForm.ctaText.trim() || !campaignForm.ctaHref.trim()) {
      toast.error("Başlık, buton metni ve buton linki zorunludur");
      return;
    }
    setSavingCampaign(true);
    try {
      const payload = {
        ...campaignForm,
        startsAt: campaignForm.startsAt ? new Date(campaignForm.startsAt).toISOString() : null,
        endsAt: campaignForm.endsAt ? new Date(campaignForm.endsAt).toISOString() : null,
      };
      const res = await fetch(
        editingCampaignId ? `/api/studio/campaigns/${editingCampaignId}` : "/api/studio/campaigns",
        {
          method: editingCampaignId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Kaydedilemedi");
        return;
      }
      toast.success(editingCampaignId ? "Kampanya güncellendi" : "Kampanya oluşturuldu");
      setCampaignFormOpen(false);
      await fetchAll();
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleToggleCampaignActive = async (c: Campaign) => {
    const res = await fetch(`/api/studio/campaigns/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) {
      toast.success(c.isActive ? "Kampanya durduruldu" : "Kampanya aktifleştirildi");
      await fetchAll();
    } else {
      toast.error("Güncellenemedi");
    }
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    if (!(await confirm(`"${c.title}" kampanyası silinsin mi?`))) return;
    const res = await fetch(`/api/studio/campaigns/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Kampanya silindi");
      await fetchAll();
    } else {
      toast.error("Silinemedi");
    }
  };

  // ── Referral codes ──

  const openNewCode = () => {
    setEditingCodeId(null);
    setCodeForm(EMPTY_CODE_FORM);
    setCodeFormOpen(true);
  };

  const openEditCode = (c: ReferralCode) => {
    setEditingCodeId(c.id);
    setCodeForm({
      code: c.code,
      ownerName: c.ownerName,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      usageLimit: c.usageLimit === null ? "" : String(c.usageLimit),
      notes: c.notes,
      isActive: c.isActive,
    });
    setCodeFormOpen(true);
  };

  const handleSaveCode = async () => {
    if (!codeForm.code.trim() || !codeForm.ownerName.trim() || !codeForm.discountValue.trim()) {
      toast.error("Kod, referans eden ve indirim değeri zorunludur");
      return;
    }
    setSavingCode(true);
    try {
      const payload = {
        ...codeForm,
        discountValue: Number(codeForm.discountValue),
        usageLimit: codeForm.usageLimit.trim() === "" ? null : Number(codeForm.usageLimit),
      };
      const res = await fetch(
        editingCodeId ? `/api/studio/referral-codes/${editingCodeId}` : "/api/studio/referral-codes",
        {
          method: editingCodeId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Kaydedilemedi");
        return;
      }
      toast.success(editingCodeId ? "Kod güncellendi" : "Kod oluşturuldu");
      setCodeFormOpen(false);
      await fetchAll();
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSavingCode(false);
    }
  };

  const handleToggleCodeActive = async (c: ReferralCode) => {
    const res = await fetch(`/api/studio/referral-codes/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) {
      toast.success(c.isActive ? "Kod pasifleştirildi" : "Kod aktifleştirildi");
      await fetchAll();
    } else {
      toast.error("Güncellenemedi");
    }
  };

  const handleDeleteCode = async (c: ReferralCode) => {
    if (!(await confirm(`"${c.code}" kodu silinsin mi?`))) return;
    const res = await fetch(`/api/studio/referral-codes/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Kod silindi");
      await fetchAll();
    } else {
      toast.error("Silinemedi");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="text-sm text-slate-500 font-medium">Kampanyalar yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kampanyalar &amp; Referans Kodları</h1>
        <p className="text-slate-500 mt-1 text-sm">Sitede gösterilen popup/banner kampanyaları ve bayi referans kodlarını yönetin</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(["campaigns", "referrals"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
              activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab === "campaigns" ? "📣 Kampanyalar" : "🔗 Referans Kodları"}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ── */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openNewCampaign}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              + Yeni Kampanya
            </button>
          </div>

          {campaignFormOpen && (
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900">{editingCampaignId ? "Kampanyayı Düzenle" : "Yeni Kampanya"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Başlık *</label>
                  <input
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                    placeholder="Örn: İlk 20 şubeye özel %50 indirim!"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Alt Metin (sadece popup&apos;ta gösterilir)</label>
                  <textarea
                    value={campaignForm.subtitle}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subtitle: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Rozet (opsiyonel)</label>
                  <input
                    value={campaignForm.badge}
                    onChange={(e) => setCampaignForm({ ...campaignForm, badge: e.target.value })}
                    placeholder="Örn: SINIRLI SÜRE"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Görünüm Yeri</label>
                  <select
                    value={campaignForm.placement}
                    onChange={(e) => setCampaignForm({ ...campaignForm, placement: e.target.value as CampaignPlacement })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="banner">Üst Banner</option>
                    <option value="modal">Popup (Modal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Buton Metni *</label>
                  <input
                    value={campaignForm.ctaText}
                    onChange={(e) => setCampaignForm({ ...campaignForm, ctaText: e.target.value })}
                    placeholder="Örn: Hemen Yakala"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Buton Linki *</label>
                  <input
                    value={campaignForm.ctaHref}
                    onChange={(e) => setCampaignForm({ ...campaignForm, ctaHref: e.target.value })}
                    placeholder="/kayit veya https://wa.me/..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Başlangıç (opsiyonel)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.startsAt}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startsAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Bitiş (opsiyonel)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.endsAt}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endsAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={campaignForm.isActive}
                    onChange={(e) => setCampaignForm({ ...campaignForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className="text-xs font-bold text-slate-700">Aktif (sitede yayınla)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveCampaign}
                  disabled={savingCampaign}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingCampaign ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  onClick={() => setCampaignFormOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                <p className="text-4xl mb-3">📣</p>
                <p className="font-semibold">Henüz kampanya oluşturulmadı</p>
              </div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${c.placement === "modal" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                        {c.placement === "modal" ? "Popup" : "Banner"}
                      </span>
                      {c.badge && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">{c.badge}</span>}
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${isLive(c) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {isLive(c) ? "● Yayında" : c.isActive ? "Zamanlanmış / Süresi Geçmiş" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-2 font-bold text-slate-900">{c.title}</p>
                    {c.subtitle && <p className="text-xs text-slate-500 mt-0.5">{c.subtitle}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Buton: <span className="font-semibold text-slate-600">{c.ctaText}</span> → {c.ctaHref}
                      {(c.startsAt || c.endsAt) && (
                        <>
                          {" · "}
                          {c.startsAt ? new Date(c.startsAt).toLocaleDateString("tr-TR") : "…"} – {c.endsAt ? new Date(c.endsAt).toLocaleDateString("tr-TR") : "…"}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleCampaignActive(c)}
                      className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition ${c.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    >
                      {c.isActive ? "Durdur" : "Aktifleştir"}
                    </button>
                    <button
                      onClick={() => openEditCampaign(c)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(c)}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── REFERRAL CODES TAB ── */}
      {activeTab === "referrals" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={openNewCode}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              + Yeni Referans Kodu
            </button>
          </div>

          {codeFormOpen && (
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900">{editingCodeId ? "Kodu Düzenle" : "Yeni Referans Kodu"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kod *</label>
                  <input
                    value={codeForm.code}
                    onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                    placeholder="Örn: AYSE10"
                    disabled={!!editingCodeId}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Referans Eden (Bayi/Kişi) *</label>
                  <input
                    value={codeForm.ownerName}
                    onChange={(e) => setCodeForm({ ...codeForm, ownerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">İndirim Tipi</label>
                  <select
                    value={codeForm.discountType}
                    onChange={(e) => setCodeForm({ ...codeForm, discountType: e.target.value as DiscountType })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="percent">Yüzde (%)</option>
                    <option value="fixed">Sabit Tutar (₺)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">İndirim Değeri *</label>
                  <input
                    type="number"
                    min={0}
                    value={codeForm.discountValue}
                    onChange={(e) => setCodeForm({ ...codeForm, discountValue: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Kullanım Limiti (boş = sınırsız)</label>
                  <input
                    type="number"
                    min={1}
                    value={codeForm.usageLimit}
                    onChange={(e) => setCodeForm({ ...codeForm, usageLimit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Not</label>
                  <input
                    value={codeForm.notes}
                    onChange={(e) => setCodeForm({ ...codeForm, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={codeForm.isActive}
                    onChange={(e) => setCodeForm({ ...codeForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                  />
                  <span className="text-xs font-bold text-slate-700">Aktif (kullanılabilir)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveCode}
                  disabled={savingCode}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingCode ? "Kaydediliyor…" : "Kaydet"}
                </button>
                <button
                  onClick={() => setCodeFormOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {codes.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-4xl mb-3">🔗</p>
                <p className="font-semibold">Henüz referans kodu oluşturulmadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Kod", "Referans Eden", "İndirim", "Kullanım", "Durum", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {codes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 font-mono font-black text-slate-900">{c.code}</td>
                        <td className="px-5 py-3 text-slate-700">{c.ownerName}{c.notes && <span className="block text-[11px] text-slate-400">{c.notes}</span>}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">
                          {c.discountType === "percent" ? `%${c.discountValue}` : `₺${c.discountValue}`}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-600">{c.usageCount}{c.usageLimit !== null ? ` / ${c.usageLimit}` : " / ∞"}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {c.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => handleToggleCodeActive(c)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${c.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                              {c.isActive ? "Durdur" : "Aç"}
                            </button>
                            <button onClick={() => openEditCode(c)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition">
                              Düzenle
                            </button>
                            <button onClick={() => handleDeleteCode(c)} className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition">
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
