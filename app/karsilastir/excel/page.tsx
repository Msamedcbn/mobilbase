import type { Metadata } from "next";
import Link from "next/link";
import { RoiCalculator } from "./roi-calculator";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";

export const metadata: Metadata = {
  title: "VibeGSM ile Excel Karşılaştırması: Telefoncular İçin Hangisi Daha Karlı?",
  description:
    "Telefoncu ve teknik servis işletmenizde Excel'i VibeGSM ile karşılaştırın; stok hataları, kaybolan tahsilat ve zaman kaybının aylık maliyetini hesaplayın.",
  alternates: { canonical: "/karsilastir/excel" },
  openGraph: {
    title: "VibeGSM vs Excel Karşılaştırması",
    description: "Telefoncu işletmenizde Excel'in gerçek maliyetini hesaplayın ve VibeGSM ile karşılaştırın.",
    url: `${BASE_URL}/karsilastir/excel`,
  },
};

const COMPARISON_ROWS: { feature: string; excel: string; vibegsm: string }[] = [
  { feature: "IMEI bazlı stok takibi", excel: "Elle girilir, kolayca hatalı/eksik kalır", vibegsm: "Otomatik, tekilleştirilmiş, uyarılı" },
  { feature: "Çoklu kullanıcı erişimi", excel: "Dosya çakışması, üzerine yazma riski", vibegsm: "Eş zamanlı, rol bazlı erişim" },
  { feature: "Veresiye / cari takip", excel: "Ayrı sekme, güncel bakiye belirsiz", vibegsm: "Anlık bakiye, WhatsApp hatırlatma" },
  { feature: "Teknik servis durumu", excel: "Kağıt fiş veya ayrı not", vibegsm: "Aşama aşama, müşteriye otomatik bildirim" },
  { feature: "Şube bazlı görünürlük", excel: "Her şube ayrı dosya, birleştirme elle", vibegsm: "Tek panelden tüm şubeler" },
  { feature: "Yedekleme / veri kaybı riski", excel: "Dosya bozulursa veri kaybı riski", vibegsm: "Bulutta otomatik, düzenli yedekleme" },
  { feature: "Kurulum ve öğrenme süresi", excel: "Kendi şablonunuzu kurmanız gerekir", vibegsm: "Ekip geçiş sürecinde size eşlik eder" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Excel ile telefoncu stok takibi yapılır mı?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Küçük ölçekte mümkündür, ancak IMEI tekilleştirme, çoklu kullanıcı erişimi ve otomatik yedekleme gibi ihtiyaçlar arttıkça hata ve veri kaybı riski hızla yükselir.",
      },
    },
    {
      "@type": "Question",
      name: "VibeGSM'e geçmek Excel verilerini kaybetmeme sebep olur mu?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hayır. Mevcut Excel dosyalarınız ve müşteri/stok listeleriniz geçiş sürecinde ekibimiz tarafından sisteme aktarılır, hiçbir kayıt silinmez.",
      },
    },
  ],
};

export default function ExcelComparisonPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfe] px-5 py-16 text-slate-900 md:px-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
          ← VibeGSM Ana Sayfa
        </Link>

        <header className="mt-6 text-center">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">Karşılaştırma</span>
          <h1 className="mt-4 text-[clamp(1.9rem,4vw,3.2rem)] font-black leading-[1.1] tracking-[-0.03em] text-slate-900">
            VibeGSM ile Excel: Telefoncu İşletmeniz İçin Hangisi Daha Karlı?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Excel ücretsizdir ama zaman, hata ve kaybolan tahsilat üzerinden gizli bir maliyeti vardır. Aşağıda
            özellik özellik karşılaştırıp, kendi işletmeniz için gerçek maliyeti hesaplayabilirsiniz.
          </p>
        </header>

        <section className="mt-14 overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="p-4 text-xs font-black uppercase tracking-wide text-slate-500">Özellik</th>
                <th className="p-4 text-xs font-black uppercase tracking-wide text-slate-500">Excel</th>
                <th className="p-4 text-xs font-black uppercase tracking-wide text-blue-600">VibeGSM</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-slate-100 last:border-0">
                  <td className="p-4 text-xs font-bold text-slate-800 md:text-sm">{row.feature}</td>
                  <td className="p-4 text-xs text-slate-500 md:text-sm">{row.excel}</td>
                  <td className="p-4 text-xs font-semibold text-slate-800 md:text-sm">{row.vibegsm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-14">
          <RoiCalculator />
        </section>

        <section className="mt-14 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-6 text-center text-white shadow-xl md:p-10">
          <h2 className="text-xl font-black md:text-3xl">Excel&apos;den VibeGSM&apos;e Geçişe Hazır Mısınız?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Mevcut Excel dosyalarınız kaybolmadan aktarılır; çoğu işletme aynı hafta içinde satışa başlar.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/kayit"
              className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              7 Gün Ücretsiz Deneyin
            </Link>
            <a
              href="https://wa.me/905454403452?text=Merhaba%2C%20Excel'den%20VibeGSM'e%20ge%C3%A7i%C5%9F%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
            >
              WhatsApp&apos;tan Sorun
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
