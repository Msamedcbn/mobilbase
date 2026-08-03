import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.vibegsm.com.tr";

const CITIES: Record<string, { name: string; region: string; description: string }> = {
  istanbul: {
    name: "İstanbul",
    region: "Marmara",
    description: "İstanbul'daki cep telefonu bayileri, teknik servis merkezleri ve 2. el alım satım mağazaları için özel bulut yönetim yazılımı.",
  },
  ankara: {
    name: "Ankara",
    region: "İç Anadolu",
    description: "Ankara genelindeki GSM dükkanları, tamirhaneler ve telefon satıcıları için IMEI stok, veresiye ve POS otomasyonu.",
  },
  izmir: {
    name: "İzmir",
    region: "Ege",
    description: "İzmir ve çevre ilçelerdeki telefon bayileri için teknik servis kabul formu, barkodlu POS ve 2. el buyback yazılımı.",
  },
  bursa: {
    name: "Bursa",
    region: "Marmara",
    description: "Bursa GSM dükkanları ve telefon tamir merkezleri için bulut tabanlı stok, kargo ve veresiye takip sistemi.",
  },
  antalya: {
    name: "Antalya",
    region: "Akdeniz",
    description: "Antalya telefoncuları ve teknik servisleri için müşteri onaylı WhatsApp takip ve barkodlu hızlı satış programı.",
  },
  adana: {
    name: "Adana",
    region: "Akdeniz",
    description: "Adana cep telefonu bayileri için IMEI takibi, veresiye borç kontrolü ve 2. el cihaz alım sözleşmesi jeneratörü.",
  },
  gaziantep: {
    name: "Gaziantep",
    region: "Güneydoğu Anadolu",
    description: "Gaziantep telefon dükkanları için GSMP backoffice mantığıyla geliştirilmiş tam teşekküllü mağaza ve tamir otomasyonu.",
  },
  konya: {
    name: "Konya",
    region: "İç Anadolu",
    description: "Konya GSM bayileri için hızlı POS satışı, stok takibi, 15 noktalı servis kabul formu ve cari hesap programı.",
  },
  kocaeli: {
    name: "Kocaeli",
    region: "Marmara",
    description: "Kocaeli ve İzmit telefon satıcıları ile teknik servisler için kesintisiz bulut mağaza otomasyon yazılımı.",
  },
  kayseri: {
    name: "Kayseri",
    region: "İç Anadolu",
    description: "Kayseri GSM dükkanları için IMEI envanteri, aksesuar satışı, yedek parça düşümü ve veresiye borç takibi.",
  },
};

type Props = {
  params: { city: string };
};

export function generateStaticParams() {
  return Object.keys(CITIES).map((city) => ({ city }));
}

export function generateMetadata({ params }: Props): Metadata {
  const cityInfo = CITIES[params.city.toLowerCase()];
  if (!cityInfo) return { title: "Şehir Bulunamadı | VibeGSM" };

  return {
    title: `${cityInfo.name} Telefoncu Yönetim Programı & Teknik Servis Yazılımı | VibeGSM`,
    description: `${cityInfo.name} şehrindeki GSM dükkanları ve telefon tamircileri için bulut tabanlı stok, POS, veresiye ve 2. el alım sözleşmesi otomasyonu.`,
    alternates: { canonical: `/sehirler/${params.city}` },
    openGraph: {
      title: `${cityInfo.name} Telefoncu Yönetim Programı | VibeGSM`,
      description: cityInfo.description,
      url: `${BASE_URL}/sehirler/${params.city}`,
    },
  };
}

export default function CitySeoPage({ params }: Props) {
  const cityKey = params.city.toLowerCase();
  const cityInfo = CITIES[cityKey];

  if (!cityInfo) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${cityInfo.name} Telefoncu ve Teknik Servis Yönetim Yazılımı`,
    provider: {
      "@type": "Organization",
      name: "VibeGSM",
      url: BASE_URL,
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: cityInfo.name,
    },
    description: cityInfo.description,
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
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
            {cityInfo.name} Yerel GSM Çözümü
          </span>
        </div>

        <header className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
            {cityInfo.name} Telefoncu Yönetim Programı &amp; Teknik Servis Otomasyonu
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            {cityInfo.description} Masaüstüne bağımlı kalmadan, <strong>{cityInfo.name}&apos;deki dükkanınızı internet olan her yerden yönetin</strong>.
          </p>
        </header>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold mb-3">
              📱
            </div>
            <h3 className="text-base font-black text-slate-900">IMEI Bazlı Mağaza Envanteri</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {cityInfo.name}&apos;deki dükkanınızda satılan veya takasa alınan tüm sıfır ve 2. el cihazları IMEI numaralarıyla tekilleştirin. Stok kaçağını sıfırlayın.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold mb-3">
              🛠️
            </div>
            <h3 className="text-base font-black text-slate-900">15 Noktalı Teknik Servis Kabulü</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Tamire gelen telefonlarda müşteri tartışmalarını önleyin. Kabul fişini bastırın ve canlı WhatsApp takip linkini otomatik gönderin.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 font-bold mb-3">
              📄
            </div>
            <h3 className="text-base font-black text-slate-900">2. El Buyback Sözleşmesi</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {cityInfo.name}&apos;de vatandaştan 2. el cihaz alırken satıcının T.C. kimlik ve IMEI beyanını yasal alım sözleşmesiyle belgeleyin.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold mb-3">
              💼
            </div>
            <h3 className="text-base font-black text-slate-900">Cari Veresiye &amp; WhatsApp Hatırlatma</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Deftere yazılan borçları unutmaya son. Müşteri bazında kredi limiti koyun ve tek tıkla saygılı WhatsApp borç hatırlatması atın.
            </p>
          </div>
        </div>



        {/* CTA Conversion Box */}
        <div className="mt-12 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-6 text-white text-center shadow-xl md:p-10">
          <h3 className="text-xl font-black md:text-3xl">
            {cityInfo.name}&apos;deki Dükkanınızı VibeGSM ile Dijitalleştirin
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300 leading-relaxed">
            10 saniyede hesabınızı oluşturun, 7 gün boyunca hiçbir ücret ödemeden tüm özellikleri sınırsız test edin.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/905454403452?text=${encodeURIComponent(`Merhaba, ${cityInfo.name} dükkanım için VibeGSM hakkında bilgi almak istiyorum.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-105"
            >
              WhatsApp ile İletişime Geçin
            </a>
            <Link
              href="/kayit"
              className="rounded-full bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              7 Gün Ücretsiz Deneyin
            </Link>
          </div>
        </div>

        {/* Other Cities Links */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Diğer Şehirler</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(CITIES).map(([slug, c]) => (
              <Link
                key={slug}
                href={`/sehirler/${slug}`}
                className={`rounded-full px-3 py-1 font-semibold transition ${
                  slug === cityKey
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {c.name} GSM Programı
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
