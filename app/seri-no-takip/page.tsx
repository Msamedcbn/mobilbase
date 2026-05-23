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
  type: "REPAIR";
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
  device: Device;
  customer: Customer | null;
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
        toast.success("Cihaz geçmişi yüklendi.");
      } else {
        toast.error(json.message || "Cihaz bulunamadı veya bir hata oluştu.");
      }
    } catch {
      toast.error("Sunucu bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (type: "REPAIR", status: string) => {
    switch (status) {
      case "RECEIVED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Kabul Edildi</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">İşlemde</span>;
      case "WAITING_PART":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Parça Bekliyor</span>;
      case "READY":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Hazır</span>;
      case "DELIVERED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">Teslim Edildi</span>;
      case "CANCELED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">İptal Edildi</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <section className="space-y-8 pb-12">
      {/* Header and Search Box */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Seri Numarası / IMEI Takibi</h2>
          <p className="text-slate-500 text-sm mt-1">Cihazların servis geçmişini kronolojik olarak izleyin.</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl flex gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono transition-all"
              placeholder="IMEI veya Seri Numarası girin..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
            <div className="absolute top-3.5 right-4 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-slate-900 font-medium rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Sorgula
          </button>
        </form>
      </div>

      {result ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info Panels */}
          <div className="lg:col-span-1 space-y-6">
            {/* Device Info */}
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-slate-900">Cihaz Bilgileri</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Marka / Model</span>
                  <span className="font-bold text-slate-800 text-base">{result.device.brand} {result.device.model}</span>
                </div>
                {result.device.imei && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">IMEI Numarası</span>
                    <span className="font-mono text-slate-700">{result.device.imei}</span>
                  </div>
                )}
                {result.device.serialNumber && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Seri Numarası</span>
                    <span className="font-mono text-slate-700">{result.device.serialNumber}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Hafıza</span>
                    <span className="font-medium text-slate-700">{result.device.storage || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Renk</span>
                    <span className="font-medium text-slate-700">{result.device.color || "-"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Durum</span>
                  {result.device.isSecondHandStock ? (
                    <span className="inline-flex px-2 py-1 rounded bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 mt-1">İkinci El Stokta</span>
                  ) : (
                    <span className="inline-flex px-2 py-1 rounded bg-slate-50 text-slate-600 text-xs font-bold border border-slate-200 mt-1">Müşteri Cihazı</span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer (Owner) Info */}
            {result.customer && (
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="font-bold text-slate-900">Kayıtlı Sahibi</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Müşteri Adı Soyadı</span>
                    <span className="font-bold text-slate-800">{result.customer.fullName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Telefon Numarası</span>
                    <span className="font-medium text-slate-700">{result.customer.phone}</span>
                  </div>
                  {result.customer.email && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider block">E-Posta</span>
                      <span className="font-medium text-slate-700">{result.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lifecycle Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cihaz Hayat Döngüsü
              </h3>

              {result.history.length === 0 ? (
                <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl">
                  Cihaza ait herhangi bir servis hareketi bulunmuyor.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                  {result.history.map((event) => {
                    return (
                      <div key={event.id} className="relative pl-6 group">
                        {/* Timeline Marker */}
                        <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 bg-blue-500 border-white group-hover:scale-110 transition"></div>

                        <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 hover:border-slate-200 p-5 rounded-2xl transition-all space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-100">
                                SERVİS
                              </span>
                              <h4 className="font-bold text-slate-900">{event.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {new Date(event.date).toLocaleDateString("tr-TR")}
                              </span>
                              {getStatusBadge(event.type, event.status)}
                            </div>
                          </div>

                          <div className="text-sm text-slate-700 space-y-1">
                            <p className="font-medium">{event.detail}</p>
                            <p className="text-slate-500 text-xs italic">Değerlendirme/Not: {event.note}</p>
                          </div>

                          {/* Repair Cost sub-card */}
                          {event.costs && (
                            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600 bg-white/50 p-2 rounded-xl border border-slate-100">
                              <div>
                                <span className="text-slate-400 block font-normal">İşçilik</span>
                                {event.costs.laborCost.toLocaleString("tr-TR")} TL
                              </div>
                              <div>
                                <span className="text-slate-400 block font-normal">Parça</span>
                                {event.costs.partCost.toLocaleString("tr-TR")} TL
                              </div>
                              <div className="text-indigo-600 font-bold">
                                <span className="text-slate-400 block font-normal">Toplam</span>
                                {event.costs.totalCost.toLocaleString("tr-TR")} TL
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50">
            <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-slate-500 font-medium">Başlamak için bir IMEI veya Cihaz Seri Numarası sorgulayın.</p>
          </div>
        )
      )}
    </section>
  );
}
