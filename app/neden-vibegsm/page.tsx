import type { Metadata } from "next";
import Link from "next/link";

const BASE_URL = process.env.APP_BASE_URL ?? "https://vibegsm.com";
const WHATSAPP_HREF = "https://wa.me/905454403452?text=Merhaba,%20VibeGSM%20hakk%C4%B1nda%20detayl%C4%B1%20bilgi%20almak%20istiyorum.";

export const metadata: Metadata = {
  title: "Neden VibeGSM? Telefon Dükkanları İçin Bulut Otomasyonu",
  description:
    "Defter ve Excel karmaşasını geride bırakın. IMEI takibi, veresiye borç takipleri ve teknik servis kabul formlarını tek bulut panelde birleştiren çözüm.",
  alternates: { canonical: "/neden-vibegsm" },
  openGraph: {
    title: "Neden VibeGSM? GSM Bayi & Servis Yönetim Çözümü",
    description: "Kayıp veresiyeler, kaybolan yedek parçalar ve müşteri tartışmaları tarih oluyor.",
    url: `${BASE_URL}/neden-vibegsm`,
  },
};

export default function NedenVibeGsmPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "VibeGSM Cloud Platform",
    image: `${BASE_URL}/icon.png`,
    description: "GSM dükkanı ve telefon teknik servis yönetim otomasyonu.",
    brand: {
      "@type": "Brand",
      name: "VibeGSM",
    },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/kayit`,
      priceCurrency: "TRY",
      price: "750",
      valueAddedTaxIncluded: true,
    },
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-16 text-slate-900 md:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
            ← VibeGSM Ana Sayfa
          </Link>
          <span className="rounded-full bg-blue-100 border border-blue-200 px-3.5 py-1 text-xs font-black text-blue-700 uppercase tracking-widest">
            Bayi Analizi
          </span>
        </header>

        {/* Hero Section */}
        <section className="text-center md:py-8">
          <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl text-slate-900">
            Dükkanda Olmadığınızda İşler Çıkmaza mı Giriyor?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Bir telefoncu ve teknik servis sahibi olarak gün boyu vitrin satışı, yedek parça maliyetleri, 
            veresiye hesapları ve teknisyen primleri arasında boğulduğunuzu biliyoruz. Defter sayfalarında 
            unutulan tek bir borç veya uyuşmazlıkla ödenen tek bir ekran, aylık kârınızı eritmeye yeter.
          </p>
        </section>

        {/* Empathy Grid - Real Problems */}
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-red-600">📝 Kağıt Defter &amp; Excel Karmaşası</h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Tanıdıklara verilen aksesuarlar, ertelenen onarım ücretleri veya taksitli cihaz satışları defter sayfalarında kalır. Borcunu ödemeye gelen müşteriyle miktar uyuşmazlığı yaşanır, kayıtlar kaybolur veya tamamen unutulur.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-red-600">⚠️ Müşteri Uyuşmazlıkları (TrueTone/Çizik)</h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Teknik servisten telefonunu alan müşteri, &quot;Cihazı verdiğimde kasasında bu çizik yoktu&quot; ya da &quot;Kameram çalışıyordu&quot; diyebilir. Yazılı, imzalı veya onaylı bir kabul fişiniz yoksa dükkanınızın itibarını korumak için haksız masrafları üstlenirsiniz.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-red-600">⚖️ İkinci El (Buyback) Çalıntı Riski</h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Vatandaştan satın aldığınız 2. el bir cep telefonu çalıntı veya suç unsuru çıkarsa, elinizde satıcının kimlik beyanını ve IMEI devrini gösteren resmi bir muvafakatname yoksa yasal olarak zan altında kalırsınız.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-black text-red-600">📉 Teknisyen Prim &amp; Hakediş Kargaşası</h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Teknisyenlerin hangi cihazı ne kadara tamir ettiği, hangi yedek parçayı stoktan düştüğü ve hak ettikleri prim oranları Excel tablosunda çakışır. Ay sonunda personel motivasyonu ve işveren güveni zarar görür.
            </p>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="mt-20">
          <h2 className="text-center text-xl font-black md:text-3xl text-slate-900">Geleneksel Yöntemler vs VibeGSM</h2>
          <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 font-bold text-slate-700">Özellik</th>
                  <th className="p-4 font-bold text-red-600">Kağıt / Excel</th>
                  <th className="p-4 font-bold text-emerald-600">VibeGSM Bulut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-4 font-bold text-slate-800">IMEI ve Stok Eşleme</td>
                  <td className="p-4 text-slate-500">Mükerrer veya hatalı IMEI kayıtları</td>
                  <td className="p-4 text-emerald-600 font-semibold">Tekil IMEI doğrulamalı stok otomasyonu</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-800">Cihaz Kabul Formu</td>
                  <td className="p-4 text-slate-500">Uçup giden kağıt fişler</td>
                  <td className="p-4 text-emerald-600 font-semibold">15 noktalı fiziki durum ve şifre kaydı</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-800">Müşteri WhatsApp Takibi</td>
                  <td className="p-4 text-slate-500">Sürekli &quot;Cihazım bitti mi?&quot; aramaları</td>
                  <td className="p-4 text-emerald-600 font-semibold">Canlı durum takip linkiyle otomatik mesaj</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-800">Veresiye Borç Limitleri</td>
                  <td className="p-4 text-slate-500">Karalanmış defter sayfaları</td>
                  <td className="p-4 text-emerald-600 font-semibold">Müşteri bazlı kredi limiti ve borç uyarısı</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-800">Mobil / Şube Kontrolü</td>
                  <td className="p-4 text-slate-500">Dükkana bağımlı bilgisayar</td>
                  <td className="p-4 text-emerald-600 font-semibold">Evden, cepten, tatilden anlık kâr/ciro izleme</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA Conversion Box */}
        <section className="mt-20 rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-8 md:p-12 text-white text-center shadow-xl">
          <h2 className="text-2xl font-black md:text-4xl text-white">
            Dükkanınızı VibeGSM Güvencesine Alın
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-xs leading-relaxed text-slate-300 md:text-sm">
            Kurulum veya taahhüt gerekmez. Sektöre özel geliştirilmiş bulut yönetim platformumuz ile 
            stoklarınızı, kasalarınızı ve teknik servisinizi tek tıkla güvenceye alın.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-sm font-black text-white shadow-lg shadow-[#25D366]/20 transition hover:brightness-105"
            >
              WhatsApp ile Detaylı Bilgi Alın
            </a>
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/20"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
