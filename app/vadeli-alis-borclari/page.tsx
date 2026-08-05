"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SupplierDebt = {
  id: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  description: string | null;
  dueDate: string | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

function formatTL(n: number) {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR");
}

export default function VadeliAlisBorclariPage() {
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAccessAllowed, setIsAccessAllowed] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(true);

  const [formSupplier, setFormSupplier] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDescription, setFormDescription] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/supplier-debts");
      if (res.status === 401 || res.status === 403) {
        setIsAccessAllowed(false);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kayıtlar getirilemedi");
      setDebts(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kayıtlar getirilemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(formAmount || 0);
    if (!formSupplier.trim()) return toast.error("Tedarikçi adı zorunludur.");
    if (!(amount > 0)) return toast.error("Geçerli bir tutar girin.");

    try {
      const res = await fetch("/api/supplier-debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: formSupplier.trim(),
          amount,
          dueDate: formDueDate || null,
          description: formDescription.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kayıt eklenemedi");
      toast.success("Vadeli alış borcu eklendi.");
      setShowAddModal(false);
      setFormSupplier("");
      setFormAmount("");
      setFormDueDate("");
      setFormDescription("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kayıt eklenemedi");
    }
  }

  async function markPaid(id: string) {
    try {
      const res = await fetch(`/api/supplier-debts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Borç ödendi olarak işaretlendi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncellenemedi");
    }
  }

  async function removeDebt(id: string) {
    try {
      const res = await fetch(`/api/supplier-debts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Kayıt silindi.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi");
    }
  }

  const visibleDebts = useMemo(
    () => (showOnlyUnpaid ? debts.filter((d) => !d.isPaid) : debts),
    [debts, showOnlyUnpaid],
  );

  const totalOutstanding = useMemo(
    () => debts.filter((d) => !d.isPaid).reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
    [debts],
  );
  const overdueCount = useMemo(() => {
    const now = Date.now();
    return debts.filter((d) => !d.isPaid && d.dueDate && new Date(d.dueDate).getTime() < now).length;
  }, [debts]);

  if (!isAccessAllowed) {
    return (
      <section className="max-w-[1400px] mx-auto p-4 md:p-6 animate-fade-in">
        <div className="panel p-8 text-center space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Erişim Yetkiniz Yok</h2>
          <p className="text-sm text-slate-500">Bu sayfa için Yönetici, Müdür veya Muhasebeci yetkisi gereklidir.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4m5-13H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Vadeli Alış Borçları</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Tedarikçilere olan vadeli borçlarınızı takip edin.</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="primary-btn text-xs py-2 px-4">
          + Yeni Borç Kaydı
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Toplam Açık Borç</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{formatTL(totalOutstanding)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ödenmemiş Kayıt</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{debts.filter((d) => !d.isPaid).length}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vadesi Geçen</p>
          <p className="mt-1 text-2xl font-black text-rose-600">{overdueCount}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showOnlyUnpaid}
          onChange={(e) => setShowOnlyUnpaid(e.target.checked)}
          className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
        />
        Sadece ödenmemiş kayıtları göster
      </label>

      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
        ) : visibleDebts.length === 0 ? (
          <div className="empty-box">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-xs">Tedarikçi</th>
                  <th className="text-xs">Tutar</th>
                  <th className="text-xs">Ödenen</th>
                  <th className="text-xs">Vade Tarihi</th>
                  <th className="text-xs">Açıklama</th>
                  <th className="text-xs">Durum</th>
                  <th className="text-xs">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {visibleDebts.map((d) => {
                  const isOverdue = !d.isPaid && d.dueDate && new Date(d.dueDate).getTime() < Date.now();
                  return (
                    <tr key={d.id}>
                      <td className="text-xs font-semibold text-slate-800">{d.supplierName}</td>
                      <td className="text-xs text-slate-600">{formatTL(d.amount)}</td>
                      <td className="text-xs text-slate-600">{formatTL(d.paidAmount)}</td>
                      <td className={`text-xs whitespace-nowrap ${isOverdue ? "font-bold text-rose-600" : "text-slate-500"}`}>
                        {formatDate(d.dueDate)}
                      </td>
                      <td className="text-xs text-slate-500 max-w-[240px] truncate" title={d.description ?? undefined}>
                        {d.description ?? "—"}
                      </td>
                      <td className="text-xs">
                        {d.isPaid ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">Ödendi</span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">Vadesi Geçti</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">Bekliyor</span>
                        )}
                      </td>
                      <td className="text-xs whitespace-nowrap space-x-2">
                        {!d.isPaid && (
                          <button type="button" onClick={() => markPaid(d.id)} className="text-blue-600 font-semibold hover:underline">
                            Ödendi İşaretle
                          </button>
                        )}
                        <button type="button" onClick={() => removeDebt(d.id)} className="text-rose-600 font-semibold hover:underline">
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowAddModal(false)}>
          <form
            onSubmit={addDebt}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900">Yeni Vadeli Alış Borcu</h3>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Tedarikçi Adı</label>
              <input
                type="text"
                className="field"
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
                placeholder="Örn: ABC Telefon Dağıtım"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Tutar (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="field"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Vade Tarihi</label>
                <input
                  type="date"
                  className="field"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase">Açıklama</label>
              <textarea
                rows={3}
                className="field resize-none"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Fatura no, ürün detayı vb."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
                Vazgeç
              </button>
              <button type="submit" className="primary-btn text-sm py-2 px-5">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
