"use client";

import { useState } from "react";
import { toast } from "sonner";

type Device = {
  id: string;
  brand: string;
  model: string;
  imei: string | null;
  serialNumber: string | null;
  storage: string | null;
  color: string | null;
  isSecondHandStock: boolean;
  createdAt: string;
};

type Customer = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
};

type HistoryEvent = {
  id: string;
  type: "REPAIR" | "BUYBACK" | "STOCK_PURCHASE" | "STOCK_OUT" | "STOCK_LOG" | "SALE" | "DEVICE_CREATED";
  date: string;
  title: string;
  status: string;
  detail: string;
  note: string;
  costs?: {
    laborCost: number;
    partCost: number;
    totalCost: number;
  };
  completedAt?: string | null;
};

type SearchResult = {
  device: Device | null;
  customer: Customer | null;
  stockItems: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    brand?: string | null;
    model?: string | null;
    variantColor?: string | null;
    variantStorage?: string | null;
    serialNumber?: string | null;
    imei?: string | null;
    quantity: number;
    purchasePrice?: number;
    purchaseDocType?: string | null;
    purchaseDocNo?: string | null;
    condition?: string | null;
    purchaseDate?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  history: HistoryEvent[];
};

export default function SerialNumberTrackingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/devices/track?query=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (res.ok) {
        setResult(json.data || json);
        toast.success("Cihaz gecmisi yuklendi.");
      } else {
        toast.error(json.message || "Cihaz bulunamadi veya bir hata olustu.");
      }
    } catch {
      toast.error("Sunucu baglanti hatasi.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Kabul</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Islemde</span>;
      case "WAITING_PART":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Parca Bekliyor</span>;
      case "READY":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hazir</span>;
      case "DELIVERED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">Teslim</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <section className="space-y-8 pb-12">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Seri Numarasi / IMEI Takibi</h2>
          <p className="text-slate-500 text-sm mt-1">Servis, alim, envanter ve satis hareketlerini tek ekranda izleyin.</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl flex gap-3">
          <input
            type="text"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono transition-all"
            placeholder="IMEI veya Seri Numarasi girin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-slate-900 font-medium rounded-xl transition-all shadow-md active:scale-95">
            {loading ? "Sorgulaniyor..." : "Sorgula"}
          </button>
        </form>
      </div>

      {result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900">Cihaz Bilgileri</h3>
              {result.device ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <p><strong>{result.device.brand} {result.device.model}</strong></p>
                  <p>IMEI: {result.device.imei || "-"}</p>
                  <p>Seri: {result.device.serialNumber || "-"}</p>
                  <p>Hafiza: {result.device.storage || "-"} / Renk: {result.device.color || "-"}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Bu numara icin cihaz karti yok, sadece envanter gecmisi bulundu.</p>
              )}
            </div>

            {result.customer && (
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2">
                <h3 className="font-bold text-slate-900">Kayitli Sahibi</h3>
                <p className="text-sm text-slate-700"><strong>{result.customer.fullName}</strong></p>
                <p className="text-sm text-slate-700">{result.customer.phone}</p>
                {result.customer.email && <p className="text-sm text-slate-700">{result.customer.email}</p>}
              </div>
            )}

            {result.stockItems?.length > 0 && (
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900">Envanter Kayitlari</h3>
                {result.stockItems.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-sm text-slate-700 space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="m-0"><strong>{s.name}</strong> ({s.sku})</p>
                      {s.condition && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700">
                          {s.condition}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-xs text-slate-500">Kategori: {s.category} / Adet: {s.quantity}</p>
                    <p className="m-0 text-xs text-slate-550">{[s.brand, s.model, s.variantColor, s.variantStorage].filter(Boolean).join(" / ") || "-"}</p>
                    <div className="pt-1.5 border-t border-slate-200 grid grid-cols-2 gap-2 text-2xs font-semibold text-slate-600">
                      <div>Alış: <strong className="text-slate-800">{Number(s.purchasePrice || 0).toLocaleString("tr-TR")} TL</strong></div>
                      <div>Tarih: <strong className="text-slate-800">{s.purchaseDate ? new Date(s.purchaseDate).toLocaleDateString("tr-TR") : "-"}</strong></div>
                    </div>
                    <p className="m-0 text-[10px] text-slate-400">{(s.purchaseDocType || s.purchaseDocNo) ? `Belge: ${s.purchaseDocType || "-"} ${s.purchaseDocNo || ""}` : "Belge yok"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-6">Cihaz Tum Hareketleri</h3>
              {result.history.length === 0 ? (
                <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl">Kayit bulunamadi.</div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                  {result.history.map((event) => (
                    <div key={event.id} className="relative pl-6">
                      <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 bg-blue-500 border-white"></div>
                      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-100">{event.type}</span>
                            <h4 className="font-bold text-slate-900">{event.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString("tr-TR")}</span>
                            {getStatusBadge(event.status)}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{event.detail}</p>
                        <p className="text-xs text-slate-500 italic">Not: {event.note}</p>
                        {event.costs && (
                          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                            <div><span className="text-slate-400 block font-normal">Iscilik</span>{event.costs.laborCost.toLocaleString("tr-TR")} TL</div>
                            <div><span className="text-slate-400 block font-normal">Parca</span>{event.costs.partCost.toLocaleString("tr-TR")} TL</div>
                            <div className="text-indigo-600 font-bold"><span className="text-slate-400 block font-normal">Toplam</span>{event.costs.totalCost.toLocaleString("tr-TR")} TL</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        !loading && <div className="text-slate-500">Baslamak icin bir IMEI veya seri no sorgulayin.</div>
      )}
    </section>
  );
}
