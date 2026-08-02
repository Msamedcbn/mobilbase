import type { Metadata } from "next";
import Link from "next/link";
import { RepairIntakeFormGenerator } from "./intake-generator";

const BASE_URL = process.env.APP_BASE_URL ?? "https://vibegsm.com";

export const metadata: Metadata = {
  title: "Ücretsiz Teknik Servis Cihaz Kabul Formu ve Barkod Tutanağı PDF",
  description:
    "Teknik servisler için 15 noktalı kozmetik ve arıza kontrol listeli ücretsiz cihaz kabul formu oluşturucu. Müşteri teslim fişini anında hazırlayın ve yazdırın.",
  keywords: [
    "teknik servis cihaz kabul formu pdf",
    "telefon tamir teslim tutanağı örneği",
    "ücretsiz teknik servis formu",
    "telefoncu servis kabul fişi",
    "cihaz arıza teslim formu",
  ],
  alternates: { canonical: "/araclar/cihaz-kabul-formu" },
  openGraph: {
    title: "Ücretsiz Teknik Servis Cihaz Kabul Formu Oluşturucu",
    description: "Cihaz teslim alırken kozmetik çizik, şifre ve veri muvafakatnamesini dijitalde eksiksiz belgeleyin.",
    type: "website",
    url: `${BASE_URL}/araclar/cihaz-kabul-formu`,
  },
};

export default function RepairIntakePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ücretsiz Teknik Servis Cihaz Kabul Formu Oluşturucu",
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
            Teknik Servis Cihaz Kabul Formu Oluşturucu
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Tamire gelen cihazın kasa çiziğini, arıza beyanını ve teslim tarihini yasal standartta kayıt altına alın.
            Bilgileri doldurun, <strong>müşterinize vereceğiniz barkodlu teslim fişini anında bastırın</strong>.
          </p>
        </header>

        <div className="mt-8">
          <RepairIntakeFormGenerator />
        </div>

        {/* Lead Capture Banner */}
        <div className="mt-12 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl md:p-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                Canlı WhatsApp Otomasyonu
              </span>
              <h3 className="mt-3 text-xl font-black md:text-2xl">
                Tamir Durumunu Müşteriye Otomatik WhatsApp ile Bildirin!
              </h3>
              <p className="mt-2 max-w-xl text-sm text-slate-300 leading-relaxed">
                VibeGSM ile cihaz kabul ettiğinizde müşterinizin telefonuna <strong>canlı durum takip linki ve WhatsApp mesajı</strong> otomatik iletilir. Dükkan içi telefon trafiğiniz %70 azalır!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <a
                href="https://wa.me/905454403452?text=Merhaba,%20teknik%20servis%20ve%20WhatsApp%20bildirim%20modülünüz%20hakkında%20bilgi%20almak%20istiyorum."
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
