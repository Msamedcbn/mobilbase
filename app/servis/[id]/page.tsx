"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RepairDetails = {
  id: string;
  deviceId: string;
  issueDescription: string;
  diagnosisNote: string | null;
  laborCost: number;
  partCost: number;
  totalCost: number;
  status: "RECEIVED" | "IN_PROGRESS" | "WAITING_PART" | "READY" | "DELIVERED" | "CANCELED";
  receivedAt: string;
  completedAt: string | null;
  branchId: string | null;
  device?: {
    id: string;
    brand: string;
    model: string;
    storage: string | null;
    imei: string | null;
    conditionNote: string | null;
    customer?: {
      fullName: string;
      phone: string;
    } | null;
  } | null;
  invoice?: {
    id: string;
    invoiceNo: string;
  } | null;
};

const STATUS_STEPS = [
  { key: "RECEIVED", label: "Kabul Edildi", desc: "Cihazınız teknik servise başarıyla teslim alındı." },
  { key: "IN_PROGRESS", label: "İncelemede", desc: "Teknisyenimiz arıza tespiti ve testleri gerçekleştiriyor." },
  { key: "WAITING_PART", label: "Parça Bekliyor", desc: "Onarım için gerekli yedek parça tedarik ediliyor." },
  { key: "READY", label: "Hazır", desc: "Onarım tamamlandı ve son kontroller yapıldı. Cihazınız hazır!" },
  { key: "DELIVERED", label: "Teslim Edildi", desc: "Cihazınız başarıyla size teslim edildi." },
];

export default function PublicRepairTracking() {
  const { id } = useParams() as { id: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repair, setRepair] = useState<RepairDetails | null>(null);

  useEffect(() => {
    async function fetchRepair() {
      try {
        const res = await fetch(`/api/repairs/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Aradığınız servis kaydı bulunamadı.");
          }
          throw new Error("Servis bilgileri yüklenirken bir hata oluştu.");
        }
        const data = await res.json();
        setRepair(data);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchRepair();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f3f6fb] via-[#e6fffb] to-[#f3f6fb] p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium animate-pulse">Servis bilgileri sorgulanıyor...</p>
        </div>
      </div>
    );
  }

  if (error || !repair) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f3f6fb] via-[#e6fffb] to-[#f3f6fb] p-6">
        <div className="max-w-md w-full backdrop-blur-md bg-white/70 border border-red-200/50 shadow-xl rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Takip Kaydı Bulunamadı</h2>
          <p className="text-slate-600 mb-6">{error || "Geçersiz veya süresi dolmuş bir servis numarası."}</p>
          <a
            href="/"
            className="inline-block bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-2.5 rounded-xl transition duration-150 shadow-md shadow-teal-700/20"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  // Parse diagnosisNote checklist
  let checklist: Record<string, string> = {};
  let techNote = "";
  if (repair.diagnosisNote) {
    try {
      const parsed = JSON.parse(repair.diagnosisNote);
      checklist = parsed.checklist || {};
      techNote = parsed.note || "";
    } catch {
      techNote = repair.diagnosisNote;
    }
  }

  // Find active step index
  const activeIndex = STATUS_STEPS.findIndex((step) => step.key === repair.status);
  const isCanceled = repair.status === "CANCELED";

  const checklistTranslations: Record<string, string> = {
    screen: "Ekran / Dokunmatik",
    battery: "Batarya Sağlığı",
    chargingPort: "Şarj Soketi",
    frontCam: "Ön Kamera",
    backCam: "Arka Kamera",
    wifi: "Wi-Fi & Bluetooth",
    speaker: "Hoparlör & Ahize",
    button: "Fiziksel Tuşlar",
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "WAITING_PART":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "READY":
        return "bg-teal-100 text-teal-700 border-teal-200";
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CANCELED":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const matched = STATUS_STEPS.find((s) => s.key === status);
    if (matched) return matched.label;
    if (status === "CANCELED") return "İptal Edildi";
    return status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e6fffb]/30 to-[#f1f5f9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="flex justify-between items-center px-4">
          <div>
            <span className="text-2xl font-black bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
              TELEFONCUPRO
            </span>
            <span className="text-xs font-semibold text-teal-800 bg-teal-100/70 border border-teal-200/50 px-2 py-0.5 rounded-full ml-2">
              Canlı Servis Takip
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Sorgulama Tarihi: {new Date().toLocaleDateString("tr-TR")}
          </div>
        </div>

        {/* Main Banner / Status Overview Card */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl"></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Takip Numarası</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">{repair.id}</h1>
              {repair.receivedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Kabul Tarihi: {new Date(repair.receivedAt).toLocaleDateString("tr-TR")} {new Date(repair.receivedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(repair.status)}`}>
                {getStatusLabel(repair.status)}
              </span>
              
              {/* E-invoice PDF action if ready or delivered */}
              {(repair.status === "READY" || repair.status === "DELIVERED") && (
                <a
                  href={`/api/invoices/e-archive/mock-pdf?uuid=${repair.invoice?.id || `mock-rep-${repair.id}`}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition shadow-md shadow-teal-700/20"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12h4.5m-8.25 3h10.5m-12.75-3h11.25m-12.75 3h11.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  e-Arşiv Fatura (PDF)
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Timeline Component */}
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-3xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 mr-2"></span>
            Onarım Süreci Takip Çizelgesi
          </h2>

          {isCanceled ? (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center text-rose-700 font-medium">
              Bu onarım işlemi teknik servisimiz tarafından iptal edilmiştir.
            </div>
          ) : (
            <div className="relative">
              {/* Desktop Stepper */}
              <div className="hidden md:grid grid-cols-5 gap-4 relative">
                {/* Connection line */}
                <div className="absolute top-6 left-8 right-8 h-0.5 bg-slate-200 -z-10">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${activeIndex === -1 ? 0 : (activeIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                  ></div>
                </div>

                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= activeIndex;
                  const isCurrent = idx === activeIndex;

                  return (
                    <div key={step.key} className="text-center flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all duration-300 ${
                          isCompleted
                            ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/30 scale-105"
                            : "bg-white border-slate-200 text-slate-400"
                        } ${isCurrent ? "ring-4 ring-teal-600/20" : ""}`}
                      >
                        {isCompleted && !isCurrent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <h3 className={`mt-3 font-semibold text-xs transition-colors duration-300 ${isCompleted ? "text-teal-900" : "text-slate-400"}`}>
                        {step.label}
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-400 leading-tight px-1">{step.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Timeline */}
              <div className="md:hidden space-y-6 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= activeIndex;
                  const isCurrent = idx === activeIndex;

                  return (
                    <div key={step.key} className="flex gap-4 items-start relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-sm shrink-0 transition-all duration-300 ${
                          isCompleted
                            ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-600/30"
                            : "bg-white border-slate-200 text-slate-400"
                        } ${isCurrent ? "ring-4 ring-teal-600/20 scale-105" : ""}`}
                      >
                        {isCompleted && !isCurrent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="pt-1">
                        <h3 className={`font-semibold text-sm ${isCompleted ? "text-teal-900" : "text-slate-500"}`}>
                          {step.label}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Device Info & Technician Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Device & Client Card */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-3xl p-6 shadow-xl">
            <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
              Cihaz Bilgileri
            </h2>
            <div className="space-y-3.5">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-400 font-medium">Marka / Model</span>
                <span className="text-xs text-slate-800 font-bold">
                  {repair.device?.brand} {repair.device?.model}
                </span>
              </div>
              {repair.device?.storage && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-400 font-medium">Kapasite</span>
                  <span className="text-xs text-slate-800 font-bold">{repair.device.storage}</span>
                </div>
              )}
              {repair.device?.imei && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs text-slate-400 font-medium">IMEI / Seri No</span>
                  <span className="text-xs text-slate-800 font-bold font-mono">
                    {repair.device.imei.length > 8
                      ? `${repair.device.imei.slice(0, 4)}********${repair.device.imei.slice(-3)}`
                      : repair.device.imei}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-400 font-medium">Müşteri</span>
                <span className="text-xs text-slate-800 font-bold">
                  {repair.device?.customer?.fullName || "Kayıtlı Müşteri"}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-xs text-slate-400 font-medium">Müşteri Beyanı</span>
                <span className="text-xs text-slate-600 text-right max-w-[200px] font-medium">
                  {repair.issueDescription}
                </span>
              </div>
            </div>
          </div>

          {/* Checklist & Technician Notes Card */}
          <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 11.684a2.25 2.25 0 013.428-1.043l3.39 2.542a2.25 2.25 0 010 3.602l-3.39 2.542a2.25 2.25 0 01-3.428-1.043l-3.39-2.542a2.25 2.25 0 010-3.602l3.39-2.542z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5v.008m0-.008v-.008m0 .008h.008" />
                </svg>
                Arıza Teşhis & Notlar
              </h2>

              {techNote ? (
                <div className="bg-teal-50/50 border border-teal-100/50 rounded-2xl p-4 mb-4 text-xs text-teal-950 font-medium leading-relaxed italic">
                  &ldquo;{techNote}&rdquo;
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-4 italic">Eklenmiş teknik not bulunmuyor.</p>
              )}

              {/* Checklist components status if any checklist keys are defined */}
              {Object.keys(checklist).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">Kontrol Edilen Donanımlar</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(checklist).map(([key, val]) => {
                      const label = checklistTranslations[key] || key;
                      const isOk = val === "OK";
                      const isBad = val === "BAD";
                      return (
                        <div key={key} className="flex items-center justify-between bg-slate-100/50 border border-slate-200/30 rounded-xl px-3 py-1.5">
                          <span className="text-[11px] font-semibold text-slate-600 truncate mr-1">{label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isOk ? "bg-emerald-100 text-emerald-800" :
                            isBad ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"
                          }`}>
                            {isOk ? "Sağlam" : isBad ? "Arızalı" : "N/A"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Total Repair Price Quote */}
            <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Toplam Onarım Tutarı</p>
                <p className="text-xs text-slate-400">Parça + İşçilik KDV Dahil</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-teal-800">
                  {repair.totalCost.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Support Info */}
        <div className="text-center text-xs text-slate-400 font-medium">
          Bu sorgulama sayfası, cihazınızın canlı teknik servis durumunu anlık takip etmeniz için otomatik üretilmiştir.<br />
          Sorularınız için bizimle iletişime geçebilirsiniz.
        </div>

      </div>
    </div>
  );
}
