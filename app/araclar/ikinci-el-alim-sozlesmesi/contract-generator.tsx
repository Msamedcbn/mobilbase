"use client";

import { useState, useRef } from "react";

export function BuybackContractGenerator() {
  const [sellerName, setSellerName] = useState("");
  const [sellerTc, setSellerTc] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceModel, setDeviceModel] = useState("iPhone 13 128GB");
  const [deviceImei, setDeviceImei] = useState("");
  const [deviceColor, setDeviceColor] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Nakit");
  const [storeName, setStoreName] = useState("GSM İletişim / Mağazası");

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Form Container */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden md:p-8">
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
            1
          </span>
          Sözleşme Bilgilerini Doldurun
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Seller Information */}
          <div className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Satıcı (Cihaz Sahibi) Bilgileri</p>
            <div>
              <label className="block text-xs font-bold text-slate-700">Satıcı Ad Soyad</label>
              <input
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">T.C. Kimlik No</label>
              <input
                type="text"
                maxLength={11}
                placeholder="11 haneli T.C. Kimlik No"
                value={sellerTc}
                onChange={(e) => setSellerTc(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Telefon Numarası</label>
              <input
                type="text"
                placeholder="05XX XXX XX XX"
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">İkametgah Adresi</label>
              <input
                type="text"
                placeholder="İl / İlçe / Mahalle"
                value={sellerAddress}
                onChange={(e) => setSellerAddress(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Device & Store Information */}
          <div className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cihaz ve Mağaza Bilgileri</p>
            <div>
              <label className="block text-xs font-bold text-slate-700">Mağaza Unvanı</label>
              <input
                type="text"
                placeholder="Dükkan / Firma Adınız"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Marka</label>
                <input
                  type="text"
                  placeholder="Apple / Samsung"
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Model</label>
                <input
                  type="text"
                  placeholder="iPhone 13 128GB"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">15 Haneli IMEI Numarası</label>
              <input
                type="text"
                maxLength={15}
                placeholder="35XXXXXXXXXXXXX"
                value={deviceImei}
                onChange={(e) => setDeviceImei(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Anlaşılan Tutar (TL)</label>
                <input
                  type="text"
                  placeholder="Örn: 14.500"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Ödeme Yöntemi</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="Nakit">Nakit</option>
                  <option value="Banka Havalesi / EFT">Banka Havalesi / EFT</option>
                  <option value="Takas Mahsubu">Takas Mahsubu</option>
                </select>
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
            Sözleşmeyi Yazdır / PDF İndir
          </button>
        </div>
      </div>

      {/* Printable Contract Document View */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 print:hidden">
          Önizleme (Yazdırıldığında A4 Sayfası Olarak Çıkar)
        </h3>

        <div
          ref={printRef}
          className="mx-auto bg-white p-6 md:p-10 border border-slate-300 text-slate-900 rounded-xl space-y-6 text-xs md:text-sm print:border-none print:p-0"
        >
          {/* Header */}
          <div className="text-center border-b border-slate-900 pb-4">
            <h2 className="text-base md:text-lg font-black uppercase tracking-wider">
              İkinci El Cep Telefonu Alım Satım Sözleşmesi ve Muvafakatname
            </h2>
            <p className="text-[11px] text-slate-600 mt-1">Düzenleme Tarihi: {currentDate}</p>
          </div>

          {/* Parties Table */}
          <div className="grid grid-cols-2 gap-4 border border-slate-400 p-3 rounded">
            <div>
              <p className="font-bold text-[11px] uppercase border-b border-slate-300 pb-1 mb-1">
                ALICI (MAĞAZA / İŞLETME)
              </p>
              <p className="font-semibold">{storeName || "[Mağaza Adı]"}</p>
            </div>
            <div>
              <p className="font-bold text-[11px] uppercase border-b border-slate-300 pb-1 mb-1">
                SATICI (MÜŞTERİ / CİHAZ SAHİBİ)
              </p>
              <p><strong>Ad Soyad:</strong> {sellerName || "................................................"}</p>
              <p><strong>T.C. Kimlik No:</strong> {sellerTc || "................................................"}</p>
              <p><strong>Telefon:</strong> {sellerPhone || "................................................"}</p>
              <p><strong>Adres:</strong> {sellerAddress || "................................................"}</p>
            </div>
          </div>

          {/* Device Details Table */}
          <div>
            <p className="font-bold text-[11px] uppercase mb-1">SATIN ALINAN CİHAZ BİLGİLERİ</p>
            <table className="w-full border-collapse border border-slate-400 text-left">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="bg-slate-100 p-2 font-bold w-1/3">Marka / Model:</td>
                  <td className="p-2 font-medium">{deviceBrand} {deviceModel}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="bg-slate-100 p-2 font-bold">15 Haneli IMEI No:</td>
                  <td className="p-2 font-mono font-bold">{deviceImei || "................................................"}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="bg-slate-100 p-2 font-bold">Kararlaştırılan Tutar:</td>
                  <td className="p-2 font-bold text-slate-900">{agreedPrice ? `${agreedPrice} TL` : "................... TL"} ({paymentMethod})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legal Terms & Muvafakatname */}
          <div className="space-y-2 text-[11px] leading-relaxed text-slate-800 border-t border-slate-300 pt-3">
            <p className="font-bold uppercase text-[11px] text-slate-900">YASAL BEYAN VE MUVAFAKATNAME MADDELERİ:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                <strong>Mülkiyet Beyanı:</strong> Satıcı, yukarıda IMEI ve model detayları verilen cihazın tek yasal sahibi olduğunu, cihaz üzerinde üçüncü kişilerin hapis, rehin veya mülkiyet hakkı bulunmadığını kabul ve beyan eder.
              </li>
              <li>
                <strong>Çalıntı / Kayıp / Klon IMEI Sorumluluğu:</strong> Satıcı; cihazın çalıntı, kayıp, gasp, adli soruşturmaya konu veya klonlanmış IMEI durumunda çıkması halinde doğacak tüm hukuki ve cezai sorumluluğun şahsına ait olduğunu kabul eder.
              </li>
              <li>
                <strong>Veri Silme ve Gizlilik:</strong> Satıcı, cihaz içerisindeki kişisel verileri, şifreleri (iCloud, Google hesabı vb.) temizlediğini ve veri kaybından alıcının sorumlu tutulamayacağını kabul eder.
              </li>
              <li>
                <strong>Ödeme ve Devir:</strong> Yukarıda belirtilen tutar satıcıya eksiksiz ödenmiş olup, cihaz alıcı mağazaya mülkiyetiyle birlikte teslim edilmiştir.
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center border-t border-slate-300">
            <div>
              <p className="font-bold text-[11px] uppercase">SATICI (CİHAZ SAHİBİ)</p>
              <p className="text-[10px] text-slate-500">Ad Soyad &amp; İmza</p>
              <div className="h-16 mt-2 border-b border-dashed border-slate-400"></div>
            </div>
            <div>
              <p className="font-bold text-[11px] uppercase">ALICI (MAĞAZA / TESLİM ALAN)</p>
              <p className="text-[10px] text-slate-500">Kaşe &amp; İmza</p>
              <div className="h-16 mt-2 border-b border-dashed border-slate-400"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
