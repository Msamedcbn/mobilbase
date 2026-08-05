import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";

export const metadata: Metadata = {
  title: "En İyi Telefoncu Yazılımları 2026: Nasıl Seçmeli?",
  description:
    "Telefon bayii ve teknik servis işletmeniz için yazılım seçerken bakmanız gereken kriterler, karşılaştırma tablosu ve 2026 için öneriler.",
  alternates: { canonical: "/en-iyi-telefoncu-yazilimlari-2026" },
  openGraph: {
    title: "En İyi Telefoncu Yazılımları 2026",
    description: "Telefoncu yazılımı seçerken bakmanız gereken kriterler ve karşılaştırma rehberi.",
    url: `${BASE_URL}/en-iyi-telefoncu-yazilimlari-2026`,
  },
};

const CRITERIA = [
  {
    title: "IMEI/seri no bazlı stok takibi var mı?",
    desc: "Aksesuar gibi adet bazlı ürünlerden farklı olarak, cihazlar tekil IMEI ile izlenmeli; aksi halde stok kaçağı ve mükerrer satış riski oluşur.",
  },
  {
    title: "Teknik servis modülü ayrı mı, entegre mi?",
    desc: "Satış ve teknik servisi aynı panelde yönetmek, cihazın hem alım-satım hem tamir geçmişini tek yerde görmenizi sağlar.",
  },
  {
    title: "Veresiye/cari takip ve WhatsApp hatırlatma var mı?",
    desc: "Deftere yazılan borçlar unutuluyor; otomatik hatırlatma tahsilat hızını doğrudan etkiler.",
  },
  {
    title: "Çoklu şube desteği ölçekleniyor mu?",
    desc: "Tek şubeden çok şubeye büyürken yazılımı değiştirmek zaman ve veri kaybı demektir; baştan çoklu şube destekleyen bir sistem seçmek uzun vadede tasarruf sağlar.",
  },
  {
    title: "Fiyatlandırma işletme büyüklüğünüze uygun mu?",
    desc: "Tek şubeli küçük bir dükkan ile çok şubeli bir zincirin ihtiyacı farklıdır; paket bazlı esnek fiyatlandırma önemlidir.",
  },
  {
    title: "Türkçe destek ve yerel mevzuata uyum var mı?",
    desc: "2. el alım sözleşmesi, e-fatura entegrasyonu gibi Türkiye'ye özgü ihtiyaçları karşılayan, Türkçe destek sunan bir çözüm tercih edilmeli.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "En İyi Telefoncu Yazılımları 2026: Nasıl Seçmeli?",
  description:
    "Telefon bayii ve teknik servis işletmeniz için yazılım seçerken bakmanız gereken kriterler ve 2026 için öneriler.",
  author: { "@type": "Organization", name: "VibeGSM" },
  publisher: { "@type": "Organization", name: "VibeGSM" },
};

export default function BestSoftwareGuidePage() {
  return (
    <main className="min-h-screen bg-[#fbfcfe] text-slate-900">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader />

      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <header>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">Satın Alma Rehberi</span>
          <h1 className="mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] font-black leading-[1.15] tracking-[-0.02em] text-slate-900">
            En İyi Telefoncu Yazılımları 2026: Nasıl Seçmeli?
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Piyasada telefon bayileri ve teknik servisler için farklı yönetim yazılımları bulunuyor. Hangisinin
            işletmenize uygun olduğuna karar vermeden önce bakmanız gereken 6 kritik kriteri ve bu kriterlere
            göre VibeGSM&apos;in nerede durduğunu aşağıda bulabilirsiniz.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-6">
          {CRITERIA.map((c, i) => (
            <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-900">{c.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-lg font-black text-slate-900 md:text-xl">VibeGSM Bu Kriterlere Nasıl Uyuyor?</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {[
              "IMEI bazlı stok takibi, satış anında otomatik tekilleştirme ile",
              "POS, teknik servis, stok, faturalama ve ikinci el alım aynı panelde",
              "Cari/veresiye bakiyesi anlık, WhatsApp üzerinden tek tık hatırlatma",
              "Şube bazlı stok ve kasa, tek merkezi görünümle çoklu şube desteği",
              "750 TL/ay'dan başlayan, işletme büyüklüğüne göre 4 farklı paket",
              "Türkçe destek, yerli ekip, 2. el alım sözleşmesi şablonu dahil",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-6 text-center text-white shadow-xl md:p-10">
          <h2 className="text-xl font-black md:text-3xl">Kriterleri Kendi İşletmenizde Test Edin</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            7 gün ücretsiz deneyin, yukarıdaki maddeleri kendi verilerinizle karşılaştırın.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/kayit"
              className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              7 Gün Ücretsiz Deneyin
            </Link>
            <Link
              href="/karsilastir/excel"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
            >
              Excel ile Karşılaştır
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
