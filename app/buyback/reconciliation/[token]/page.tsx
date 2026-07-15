"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type ReconciliationPayload = {
  id: string;
  status: string;
  tokenExpiresAt: string;
  customerPrice: number;
  companyPrice: number;
  differenceAmount: number;
  customerNote: string | null;
  buybackDeal?: {
    id: string;
    customer?: { fullName: string | null } | null;
    device?: {
      brand: string;
      model: string;
      storage?: string | null;
      imei?: string | null;
      conditionNote?: string | null;
    } | null;
  };
};

export default function ReconciliationTokenPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<ReconciliationPayload | null>(null);
  const [error, setError] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/buyback/reconciliation/${params.token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Mutabakat bilgisi alınamadı");
        setData(json);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Mutabakat bilgisi alınamadı"));
  }, [params.token]);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (decision === "APPROVED" && !termsAccepted) {
      toast.error("Devir sözleşmesi şartlarını onaylamalısınız.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/buyback/reconciliation/${params.token}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Karar kaydedilemedi");
      setData((prev) => (prev ? { ...prev, status: decision } : prev));
      toast.success(decision === "APPROVED" ? "Mutabakat başarıyla onaylandı!" : "Mutabakat reddedildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Karar kaydedilemedi");
      toast.error(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  }

  // Parse condition note
  let screenCondition = "Belirtilmemiş";
  let bodyCondition = "Belirtilmemiş";
  let batteryHealth = "Belirtilmemiş";
  let brokenComponents = "Yok";

  const conditionStr = data?.buybackDeal?.device?.conditionNote;
  if (conditionStr) {
    const parts = conditionStr.split("|").map((p) => p.trim());
    parts.forEach((p) => {
      const [key, val] = p.split(":").map((x) => x.trim());
      if (key && val) {
        if (key.toLowerCase().includes("ekran")) {
          if (val === "excellent") screenCondition = "Mükemmel (Çiziksiz)";
          else if (val === "good") screenCondition = "İyi (Hafif Çizikler)";
          else if (val === "bad") screenCondition = "Kırık / Çatlak";
          else screenCondition = val;
        } else if (key.toLowerCase().includes("kasa")) {
          if (val === "excellent") bodyCondition = "Mükemmel (Kozmetik Sıfır)";
          else if (val === "good") bodyCondition = "İyi (Hafif Ezikler var)";
          else if (val === "bad") bodyCondition = "Ezik / Ağır Darbeli";
          else bodyCondition = val;
        } else if (key.toLowerCase().includes("pil")) {
          if (val === "above90") batteryHealth = "%90 Üzeri (Çok İyi)";
          else if (val === "between80_90") batteryHealth = "%80-%90 (Normal)";
          else if (val === "below80") batteryHealth = "%80 Altı (Servis Önerilir)";
          else batteryHealth = val;
        } else if (key.toLowerCase().includes("ariza") || key.toLowerCase().includes("arıza")) {
          brokenComponents = val;
        }
      }
    });
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800">Erişim Hatası</h2>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-sm transition-all">
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Mutabakat detayları yükleniyor...</p>
        </div>
      </main>
    );
  }

  const isCompleted = data.status === "APPROVED" || data.status === "REJECTED";
  const isApproved = data.status === "APPROVED";
  const maskedImei = data.buybackDeal?.device?.imei
    ? `${data.buybackDeal.device.imei.slice(0, 4)}******${data.buybackDeal.device.imei.slice(-4)}`
    : "-";

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 py-8 px-4 sm:py-12">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-blue-700 flex items-center justify-center text-white text-sm font-bold">P</span>
            <span className="text-lg font-bold tracking-tight text-slate-800">VibeGSM Partner</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">Cihaz Mutabakat Onayı</h1>
          <p className="text-sm text-slate-500 max-w-sm">
            Lütfen teklif değerlendirmesini ve kondisyon durumunu inceleyip onayınızı iletin.
          </p>
        </div>

        {/* Status Indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">İşlem Durumu</span>
              <div className="mt-1 flex items-center gap-2">
                {data.status === "SENT" && (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="font-bold text-blue-700">Değerlendirme Aşamasında</span>
                  </>
                )}
                {data.status === "VIEWED" && (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <span className="font-bold text-amber-700">Müşteri Tarafından İnceleniyor</span>
                  </>
                )}
                {data.status === "APPROVED" && (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-emerald-700">Mutabakat Onaylandı</span>
                  </>
                )}
                {data.status === "REJECTED" && (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                    <span className="font-bold text-rose-700">Müşteri Tarafından Reddedildi</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Steps Timeline for Customer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 border border-blue-200">1</span>
                <span className="w-6 h-0.5 bg-blue-200"></span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 border border-blue-200">2</span>
                <span className="w-6 h-0.5 bg-blue-200"></span>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold border ${isCompleted ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-blue-600 text-white border-blue-600"}`}>3</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Onay Adımı</span>
            </div>
          </div>
        </div>

        {/* Device Info & Condition Card */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📱</span> Cihaz ve Puanlama Bilgileri
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Teslim alınan cihazın fiziksel ekspertiz özeti</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs font-medium">Marka / Model</span>
                <p className="font-bold text-slate-800 mt-0.5">{data.buybackDeal?.device?.brand} {data.buybackDeal?.device?.model}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs font-medium">Kapasite / Hafıza</span>
                <p className="font-bold text-slate-800 mt-0.5">{data.buybackDeal?.device?.storage ?? "Belirtilmemiş"}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs font-medium">IMEI Numarası</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{maskedImei}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs font-medium">Teklif Referans No</span>
                <p className="font-mono text-slate-500 mt-0.5 text-xs">#{data.buybackDeal?.id ?? "-"}</p>
              </div>
            </div>

            {/* Condition scores detail */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ekspertiz Raporu</h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/75 border border-slate-100">
                  <span className="text-slate-600 font-medium">Ekran Durumu</span>
                  <span className="font-bold text-slate-800">{screenCondition}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/75 border border-slate-100">
                  <span className="text-slate-600 font-medium">Kasa Durumu</span>
                  <span className="font-bold text-slate-800">{bodyCondition}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/75 border border-slate-100">
                  <span className="text-slate-600 font-medium">Pil Sağlığı</span>
                  <span className="font-bold text-slate-800">{batteryHealth}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/75 border border-slate-100">
                  <span className="text-slate-600 font-medium">Arızalı Aksam</span>
                  <span className={`font-bold ${brokenComponents === "Yok" ? "text-emerald-600" : "text-rose-500"}`}>{brokenComponents}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Comparison Card */}
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/40 to-emerald-50/20 p-6 shadow-sm border-2">
          <h2 className="text-lg font-bold text-blue-900 mb-1 flex items-center gap-2">
            <span>💰</span> Fiyat ve Değerleme Özeti
          </h2>
          <p className="text-xs text-blue-700/80 mb-6">Müşteri beyanı ile uzman incelemesi fark analizi</p>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Customer expected price */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100/50 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Müşteri Beyan Fiyatı</span>
              <span className="text-xl font-bold text-slate-700 block mt-1">
                {data.customerPrice.toLocaleString("tr-TR")} TL
              </span>
            </div>

            {/* Expert company evaluation price */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100/50 shadow-xs ring-2 ring-blue-600 ring-offset-2">
              <span className="text-xs text-blue-600 font-semibold block">Nihai Fiyat Teklifi</span>
              <span className="text-2xl font-extrabold text-blue-800 block mt-1">
                {data.companyPrice.toLocaleString("tr-TR")} TL
              </span>
            </div>

            {/* Price difference */}
            <div className="bg-white rounded-2xl p-4 border border-blue-100/50 shadow-xs">
              <span className="text-xs text-slate-400 font-medium block">Revizyon Farkı</span>
              <span className={`text-xl font-bold block mt-1 ${data.differenceAmount > 0 ? "text-amber-600" : "text-slate-700"}`}>
                {data.differenceAmount > 0 ? `-${data.differenceAmount.toLocaleString("tr-TR")} TL` : "0 TL"}
              </span>
            </div>
          </div>

          <div className="mt-5 text-xs text-blue-700/80 leading-relaxed bg-white/50 rounded-xl p-3 border border-blue-100/20">
            <strong>* Not:</strong> Nihai fiyat teklifi, cihazın fiziki ekspertizi esnasında tespit edilen kozmetik/donanımsal detaylar doğrultusunda revize edilmiştir.
          </div>
        </div>

        {/* Action Panel for customer choice */}
        {!isCompleted ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Kararınız</h2>
              <p className="text-xs text-slate-400 mt-0.5">Lütfen işlemi onaylayın veya reddedin.</p>
            </div>

            {/* Terms and Conditions Acceptance */}
            <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                Cihazın beyan ettiğim seri numarası/IMEI ile eşleştiğini doğrular; satışı onaylamam halinde dükkan tarafından hazırlanan <strong>İkinci El Cihaz Devir Sözleşmesi</strong> şartlarını ve cihaz mülkiyetinin yasal olarak dükkana devredilmesini kabul ederim.
              </span>
            </label>

            {/* Note Area */}
            <div className="space-y-1.5">
              <label htmlFor="customer-note" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Notunuz (İsteğe Bağlı)</label>
              <textarea
                id="customer-note"
                className="field text-sm"
                rows={3}
                placeholder="Varsa iletmek istediğiniz ek notu yazın..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <button
                className="primary-btn py-3.5 font-bold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all bg-blue-700 hover:bg-blue-800"
                disabled={loading || !termsAccepted}
                onClick={() => void decide("APPROVED")}
              >
                {loading ? "Onaylanıyor..." : "Teklifi Kabul Et ve Onayla"}
              </button>
              <button
                className="field border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-800 font-bold py-3.5 rounded-xl shadow-xs transition-all"
                disabled={loading}
                onClick={() => void decide("REJECTED")}
              >
                {loading ? "Reddediliyor..." : "Teklifi Reddet"}
              </button>
            </div>
          </div>
        ) : (
          /* Thank You / Confirmed screen state */
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto text-3xl ${isApproved ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"}`}>
              {isApproved ? "✓" : "✗"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {isApproved ? "Mutabakat Onaylandı" : "Mutabakat Reddedildi"}
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                {isApproved
                  ? "Cihaz geri alım mutabakatını onayladınız. Sistem otomatik olarak ikinci el alış sözleşmesini oluşturmuş ve dükkana aktarmıştır. Ödeme işleminiz dükkan yetkilisi tarafından tamamlanacaktır."
                  : "Cihaz geri alım revize teklifini reddettiniz. İşlem sonlandırılmış olup dükkan yetkilisine bilgilendirme geçilmiştir. İlginiz için teşekkür ederiz."}
              </p>
            </div>
            {data.customerNote && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-w-md mx-auto text-left text-xs">
                <strong className="text-slate-400 block uppercase mb-1">Bıraktığınız Not:</strong>
                <span className="text-slate-600">{data.customerNote}</span>
              </div>
            )}
            <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
              VibeGSM Mutabakat Altyapısı Güvencesiyle
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
