"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExportCsvButton } from "@/components/export-csv-button";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
  actorUser: { fullName: string; email: string } | null;
  customer: { fullName: string } | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

export default function DenetimKayitlariPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAccessAllowed, setIsAccessAllowed] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  async function load(customFrom?: string, customTo?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/audit-log${params.toString() ? `?${params.toString()}` : ""}`);
      if (res.status === 401 || res.status === 403) {
        setIsAccessAllowed(false);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Denetim kayıtları getirilemedi");
      setEntries(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Denetim kayıtları getirilemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action))).sort();

  if (!isAccessAllowed) {
    return (
      <section className="max-w-[1400px] mx-auto p-4 md:p-6 animate-fade-in">
        <div className="panel p-8 text-center space-y-2">
          <h2 className="text-lg font-bold text-slate-900">Erişim Yetkiniz Yok</h2>
          <p className="text-sm text-slate-500">Denetim Kayıtları için Yönetici veya Müdür yetkisi gereklidir.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Denetim Kayıtları</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Sistemde kim, ne zaman, hangi işlemi yaptı — geriye dönük kayıt.</p>
          </div>
        </div>
        <ExportCsvButton
          rows={entries}
          filename="denetim-kayitlari"
          columns={[
            { header: "Tarih", accessor: (r) => formatDateTime(r.createdAt) },
            { header: "İşlem", accessor: (r) => r.action },
            { header: "Varlık Türü", accessor: (r) => r.entityType },
            { header: "Yapan", accessor: (r) => r.actorUser?.fullName ?? "" },
            { header: "İlgili Müşteri", accessor: (r) => r.customer?.fullName ?? "" },
            { header: "Detay", accessor: (r) => r.detail ?? "" },
          ]}
        />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void load(from, to); }}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Başlangıç</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field text-xs py-1.5 px-2" style={{ width: "8.5rem" }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bitiş</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field text-xs py-1.5 px-2" style={{ width: "8.5rem" }} />
        </div>
        {uniqueActions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">İşlem</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="field text-xs py-1.5 px-2">
              <option value="">Tümü</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="primary-btn text-xs py-1.5 px-4">Filtrele</button>
      </form>

      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
        ) : entries.length === 0 ? (
          <div className="empty-box">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-xs">Tarih</th>
                  <th className="text-xs">İşlem</th>
                  <th className="text-xs">Varlık</th>
                  <th className="text-xs">Yapan</th>
                  <th className="text-xs">İlgili Müşteri</th>
                  <th className="text-xs">Detay</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                    <td className="text-xs font-mono font-semibold text-slate-700">{e.action}</td>
                    <td className="text-xs text-slate-600">{e.entityType}</td>
                    <td className="text-xs text-slate-600">{e.actorUser?.fullName ?? "—"}</td>
                    <td className="text-xs text-slate-600">{e.customer?.fullName ?? "—"}</td>
                    <td className="text-xs text-slate-500 max-w-[320px] truncate" title={e.detail ?? undefined}>{e.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
