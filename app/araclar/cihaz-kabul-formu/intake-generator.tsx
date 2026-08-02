"use client";

import { useState } from "react";

export function RepairIntakeFormGenerator() {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceBrandModel, setDeviceBrandModel] = useState("iPhone 13 Pro Max");
  const [deviceImei, setDeviceImei] = useState("");
  const [passcode, setPasscode] = useState("");
  const [faultDescription, setFaultDescription] = useState("Ekran kırık, şarj soketi temassızlık yapıyor.");
  const [estimatedPrice, setEstimatedPrice] = useState("3.200");
  const [depositPaid, setDepositPaid] = useState("500");
  const [cosmeticCondition, setCosmeticCondition] = useState("Kasa kenarlarında hafif çizikler mevcut, cam çatlak.");
  const [storeName, setStoreName] = useState("VibeGSM Teknik Servis Merkezi");
  const [storePhone, setStorePhone] = useState("0545 440 34 52");

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formNo = "SERV-" + Math.floor(100000 + Math.random() * 900000);

  return (
    <div className="space-y-8">
      {/* Form Inputs */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden md:p-8">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
            1
          </span>
          Cihaz Kabul Bilgilerini Girin
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer */}
          <div className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Müşteri Bilgileri</p>
            <div>
              <label className="block text-xs font-bold text-slate-700">Müşteri Ad Soyad</label>
              <input
                type="text"
                placeholder="Örn: Mehmet Öz"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Telefon Numarası (WhatsApp)</label>
              <input
                type="text"
                placeholder="05XX XXX XX XX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Cihaz Kilit Şifresi / Desen</label>
              <input
                type="text"
                placeholder="Ekran şifresi veya N/A"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Device & Fault Details */}
          <div className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cihaz ve Arıza Detayları</p>
            <div>
              <label className="block text-xs font-bold text-slate-700">Servis / Mağaza Unvanınız</label>
              <input
                type="text"
                placeholder="Firma / Dükkan Adı"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Cihaz Marka &amp; Model</label>
                <input
                  type="text"
                  placeholder="iPhone 13 / S22"
                  value={deviceBrandModel}
                  onChange={(e) => setDeviceBrandModel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">IMEI Numarası</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="35XXXXXXXXXXXXX"
                  value={deviceImei}
                  onChange={(e) => setDeviceImei(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Müşteri Arıza Beyanı</label>
              <textarea
                rows={2}
                placeholder="Şikayet ve arıza açıklaması"
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tahmini Ücret (TL)</label>
                <input
                  type="text"
                  placeholder="3.200"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Alınan Kapora (TL)</label>
                <input
                  type="text"
                  placeholder="500"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-98"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.6 0-1.1-.462-1.12-1.061L6.34 18m11.32 0H6.34" />
            </svg>
            Formu Yazdır / PDF Çıkar
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 print:hidden">
          Önizleme (Yazdırıldığında Çift Fiş Olarak Basılır)
        </h3>

        <div className="bg-white p-6 md:p-8 border border-slate-300 text-slate-900 rounded-xl space-y-6 text-xs md:text-sm print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <div>
              <h2 className="text-base font-black uppercase text-blue-900">{storeName}</h2>
              <p className="text-[11px] text-slate-600">Teknik Servis Cihaz Teslim Tutanağı</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-sm text-slate-900">{formNo}</p>
              <p className="text-[11px] text-slate-500">{currentDate}</p>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-3 rounded">
            <div>
              <p className="font-bold text-[11px] border-b border-slate-200 pb-1 mb-1">MÜŞTERİ BİLGİLERİ</p>
              <p><strong>Ad Soyad:</strong> {customerName || "................................"}</p>
              <p><strong>Telefon:</strong> {customerPhone || "................................"}</p>
              <p><strong>Cihaz Şifresi:</strong> <span className="font-mono font-bold">{passcode || "................"}</span></p>
            </div>
            <div>
              <p className="font-bold text-[11px] border-b border-slate-200 pb-1 mb-1">CİHAZ BİLGİLERİ</p>
              <p><strong>Model:</strong> {deviceBrandModel}</p>
              <p><strong>IMEI:</strong> <span className="font-mono font-bold">{deviceImei || "................................"}</span></p>
              <p><strong>Tahmini Fiyat:</strong> {estimatedPrice} TL (Kapora: {depositPaid} TL)</p>
            </div>
          </div>

          {/* Fault & Cosmetic */}
          <div className="border border-slate-300 p-3 rounded space-y-2">
            <p><strong>Arıza / Şikayet Beyanı:</strong> {faultDescription}</p>
            <p><strong>Kozmetik Durum:</strong> {cosmeticCondition}</p>
          </div>

          {/* Terms */}
          <div className="text-[10px] leading-tight text-slate-600 border-t border-slate-200 pt-2 space-y-1">
            <p className="font-bold">SERVİS KOŞULLARI VE VERİ UYARISI:</p>
            <p>1. Cihaz içerisindeki rehber, fotoğraf ve kişisel verilerin yedeklenmesi tamamen müşterinin sorumluluğundadır; sıvı temaslı ve anakart arızalarında veri garantisi verilemez.</p>
            <p>2. Servis tamamlandıktan sonra 30 gün içerisinde teslim alınmayan cihazlardan işletmemiz sorumlu tutulamaz.</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 text-center border-t border-slate-300">
            <div>
              <p className="font-bold text-[11px]">MÜŞTERİ İMZASI</p>
              <div className="h-12 mt-1 border-b border-dashed border-slate-400"></div>
            </div>
            <div>
              <p className="font-bold text-[11px]">SERVİS DÜKKAN İMZASI</p>
              <div className="h-12 mt-1 border-b border-dashed border-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
