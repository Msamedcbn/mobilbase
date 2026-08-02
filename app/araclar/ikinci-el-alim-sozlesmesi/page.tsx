import type { Metadata } from "next";
import Link from "next/link";
import { BuybackContractGenerator } from "./contract-generator";

const BASE_URL = process.env.APP_BASE_URL ?? "https://vibegsm.com";

export const metadata: Metadata = {
  title: "Ücretsiz İkinci El Telefon Alım Sözleşmesi Oluşturucu ve Muvafakatname PDF",
  description:
    "İkinci el telefon alım satımında (buyback) yasal koruma sağlayan T.C. kimlik muvafakatnameli alım sözleşmesi oluşturucu. Ücretsiz doldurun ve anında yazdırın.",
  keywords: [
    "ikinci el telefon alım sözleşmesi örneği pdf",
    "2 el cep telefonu alım formu",
    "buyback muvafakatname örneği",
    "çalıntı telefon imei sorumluluk formu",
    "telefoncu yasal alım satım sözleşmesi",
  ],
  alternates: { canonical: "/araclar/ikinci-el-alim-sozlesmesi" },
  openGraph: {
    title: "Ücretsiz İkinci El Telefon Alım Sözleşmesi & Muvafakatname Jeneratörü",
    description: "İkinci el telefon alımlarında bayinizi çalıntı/kayıp IMEI riskine karşı yasal korumaya alın.",
    type: "website",
    url: `${BASE_URL}/araclar/ikinci-el-alim-sozlesmesi`,
  },
};

export default function BuybackContractPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ücretsiz İkinci El Telefon Alım Sözleşmesi Oluşturucu",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "TRY",
    },
  };

  return (
    <main className="min-h-screen bg-[#fbfcfe] px-4 py-12 text-slate-900 md:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
            ← VibeGSM Ana Sayfa
          </Link>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            %100 Ücretsiz Araç
          </span>
        </div>

        <header className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
            İkinci El Telefon Alım Sözleşmesi &amp; Muvafakatname Oluşturucu
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            İkinci el (buyback) telefon alırken satıcının T.C. kimlik ve IMEI beyanını yasal olarak belgeleyin.
            Bilgileri doldurun, <strong>tek tıkla A4 veya termal fiş formatında yazdırın</strong>.
          </p>
        </header>

        <div className="mt-8">
          <BuybackContractGenerator />
        </div>

        {/* Lead Capture Banner */}
        <div className="mt-12 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl md:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                Otomatikleştirin &amp; Dijitalleştirin
              </span>
              <h3 className="mt-3 text-xl font-black md:text-2xl">
                Sözleşmeleri Tek Tek Elle Doldurmaktan Yoruldunuz mu?
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300 leading-relaxed">
                VibeGSM ile 2. el cihaz alırken müşteri ve cihaz bilgilerini girdiğiniz an yasal sözleşme ve muvafakatname
                <strong> tek tıkla otomatik üretilir</strong>, IMEI envanter kaydı stoğa işlenir ve yazıcıdan anında basılır.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <a
                href="https://wa.me/905454403452?text=Merhaba,%202.%20el%20buyback%20sözleşme%20modülünüz%20hakkında%20bilgi%20almak%20istiyorum."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-105"
              >
                WhatsApp&apos;tan Bilgi Al
              </a>
              <Link
                href="/kayit"
                className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                14 Gün Ücretsiz Deneyin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
