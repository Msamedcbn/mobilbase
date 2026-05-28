export const dynamic = "force-dynamic";

import Link from "next/link";
import { readLocalStore } from "@/lib/local-store";

type PlanKey = "Lite" | "Service" | "Pro" | "Enterprise";

export default async function LandingPage() {
  const store = await readLocalStore();

  const pricing = store.resellerPricing || {
    Lite: 750,
    Service: 990,
    Pro: 1500,
    Enterprise: 3500,
    freeBranchLimit: 5,
    branchSurchargePrice: 150,
    addons: {
      apiPackPrice: 150,
      dbGbPrice: 200,
      customDevHourly: 1200,
      annualDiscountPct: 15,
    },
    features: {
      Lite: { pos: true, repairs: true, stock: false, invoicing: false, buyback: false, supportLevel: "Standart" },
      Service: { pos: false, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Teknik servis odaklı" },
      Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hızlı" },
      Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 SLA" },
    },
  };

  const addons = pricing.addons || {
    apiPackPrice: 150,
    dbGbPrice: 200,
    customDevHourly: 1200,
    annualDiscountPct: 15,
  };

  const plans: Array<{ key: PlanKey; subtitle: string; badge?: string }> = [
    { key: "Lite", subtitle: "Başlangıç seviyesinde net kontrol" },
    { key: "Service", subtitle: "Teknik servis odaklı operasyon" },
    { key: "Pro", subtitle: "Büyüme ve otomasyon dengesi", badge: "Editor's Pick" },
    { key: "Enterprise", subtitle: "Kurumsal ölçek ve SLA" },
  ];

  const featureNames: Array<{ key: "pos" | "repairs" | "stock" | "invoicing" | "buyback"; label: string }> = [
    { key: "pos", label: "POS" },
    { key: "repairs", label: "Teknik Servis" },
    { key: "stock", label: "Stok" },
    { key: "invoicing", label: "Faturalama" },
    { key: "buyback", label: "İkinci El" },
  ];

  return (
    <div className="premium-root min-h-screen text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060b16]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="logo-mark" />
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[#97a9c7]">Mobibase</p>
              <p className="text-sm font-bold tracking-[0.08em] text-white">Bulut Platformu</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#b8c6de] md:flex">
            <a href="#vizyon" className="hover:text-white">Vizyon</a>
            <a href="#cozum" className="hover:text-white">Mimari</a>
            <a href="#paketler" className="hover:text-white">Paketler</a>
            <a href="#iletisim" className="hover:text-white">İletişim</a>
          </nav>
          <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-white/15">
            Müşteri Girişi
          </Link>
        </div>
      </header>

      <main>
        <section id="vizyon" className="hero-wrap relative overflow-hidden px-6 pb-16 pt-20 md:pt-24">
          <div className="parallax orbital-a" aria-hidden />
          <div className="parallax orbital-b" aria-hidden />
          <div className="parallax grid-fx" aria-hidden />

          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#91d9ff]">
                Telefon Perakendesi İçin Operasyon Sistemi
              </p>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.03] tracking-[-0.03em] text-white md:text-6xl">
                Satış, servis ve finansı
                <span className="block bg-gradient-to-r from-[#7dd3fc] via-[#c4b5fd] to-[#f9a8d4] bg-clip-text text-transparent">
                  premium bir kontrol katmanında birleştirin.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#bbcae2] md:text-lg">
                MobiBase, bayi operasyonunu dağınık tablolar yerine bir tasarım sistemi netliğinde yönetir.
                Servis adımları, stok ivmesi ve tahsilat riski aynı kompozisyonda görünür olur.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#iletisim" className="rounded-full bg-gradient-to-r from-[#7dd3fc] to-[#c4b5fd] px-7 py-3 text-sm font-bold text-[#081224] hover:brightness-110">
                  Demo ve Geçiş Planı
                </a>
                <a href="#paketler" className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Paketleri İncele
                </a>
              </div>
            </div>

            <aside className="premium-card rounded-[28px] p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9fb3d6]">Canlı Operasyon Görünümü</p>
              <div className="mt-5 space-y-3">
                {[
                  ["Servis Akışı", "Bugün 46 kayıt", "+18%"],
                  ["Tahsilat Nabzı", "Riskli vade 11 dosya", "-22%"],
                  ["Stok Devir Hızı", "Son 7 gün 1.9x", "+14%"],
                ].map(([title, meta, delta]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-[#0c1628]/75 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#e2ecff]">{title}</p>
                      <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold text-emerald-200">{delta}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#a8bddb]">{meta}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="-mt-2 px-6 pb-6">
          <div className="mx-auto grid max-w-7xl gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur md:grid-cols-3">
            {["Kurulum Çıkışı: 1 İş Günü", "Canliya Geçiş: Veri Tasima Dahil", "Yönetici Paneli: Tek Bakışta Kontrol"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-[#0a1322]/70 p-4 text-center text-sm font-semibold text-[#d3e3fa]">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="cozum" className="relative overflow-hidden px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Figma kalitesinde akışa dayalı bilgi mimarisi</h2>
            <p className="mt-3 max-w-2xl text-sm text-[#b7c7df] md:text-base">Modüller sadece veri göstermiyor; operasyon kararlarını hızlandıran görsel hiyerarşiyle sunuyor.</p>

            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {[
                ["Cihaz ve Müşteri Zaman Çizelgesi", "Tüm servis, satış ve tahsilat geçmişini tek bir kronolojiye bağlar."],
                ["Süreç Komuta Alanı", "Kayıt, bekleme, hazır ve teslim aşamalarını gecikme sinyalleriyle izler."],
                ["Finans Sinyal Katmanı", "Vade dağılımı, borç/alacak yoğunluğu ve tahsilat riskini önceliklendirir."],
                ["Satış-Stok Maliyet Motoru", "POS işlemini stok, kâr ve maliyet tarafına otomatik dağıtır."],
              ].map(([title, desc], idx) => (
                <article key={title} className="feature-tile rounded-3xl border border-white/10 p-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8fb4ff]">Modül {String(idx + 1).padStart(2, "0")}</p>
                  <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#b7c8e2]">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="paketler" className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">Premium Paket Yapısı</h2>
                <p className="mt-2 text-sm text-[#b6c9e4]">Tüm fiyatlar aylıktır. Yıllık ödemede %{addons.annualDiscountPct} indirim uygulanır.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-4">
              {plans.map((plan) => {
                const f = (pricing.features as any)?.[plan.key] || {};
                const amount = Number((pricing as any)[plan.key] || 0);
                const highlighted = Boolean(plan.badge);

                return (
                  <article
                    key={plan.key}
                    className={`rounded-3xl border p-6 ${
                      highlighted
                        ? "border-[#a78bfa]/60 bg-[linear-gradient(170deg,#15122d_0%,#0c1834_45%,#0f2742_100%)] shadow-[0_16px_70px_-24px_rgba(167,139,250,0.7)]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">{plan.key}</h3>
                        <p className="mt-1 text-xs text-[#a9bcda]">{plan.subtitle}</p>
                      </div>
                      {highlighted ? <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#28163d]">{plan.badge}</span> : null}
                    </div>

                    <div className="mt-5 text-4xl font-extrabold tracking-tight text-white">{amount.toLocaleString("tr-TR")} TL</div>
                    <p className="text-xs text-[#9db2d2]">Aylık lisans</p>

                    <div className="mt-5 space-y-2 text-xs text-[#c6d8ef]">
                      {featureNames.map((it) => (
                        <div key={it.key} className="flex items-center justify-between border-b border-white/10 pb-1.5">
                          <span>{it.label}</span>
                          <span className={f[it.key] ? "text-emerald-200" : "text-slate-400"}>{f[it.key] ? "Var" : "Yok"}</span>
                        </div>
                      ))}
                      <p className="pt-2 text-[#a9c4e9]">Destek: {f.supportLevel || "Standart"}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-7 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-xs text-[#cadcf2] md:grid-cols-3">
              <div>Ek 10.000 API: <strong>{addons.apiPackPrice} TL</strong></div>
              <div>Ek 1 GB Veritabanı: <strong>{addons.dbGbPrice} TL</strong></div>
              <div>Ek Şube: <strong>{pricing.branchSurchargePrice} TL / ay</strong></div>
            </div>
          </div>
        </section>

        <section id="iletisim" className="px-6 pb-20 pt-8">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-white/15 bg-[linear-gradient(155deg,#0d1629_0%,#0f1f3c_58%,#11152c_100%)] p-8 text-center shadow-[0_18px_80px_-22px_rgba(56,189,248,0.45)] md:p-12">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8db8f5]">Bir Günde Canlıya Geçiş</p>
            <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-5xl">Size özel teklif ve geçiş planı hazırlayalım.</h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-[#b8cae5] md:text-base">Ihtiyaciniza uygun paket, veri gecisi ve kurulum adımlarıni aynı gun icinde net yol haritasi olarak iletelim.</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a href="mailto:satis@mobibase.com?subject=MobiBase%20Teklif%20Talebi" className="rounded-full bg-white px-7 py-3 text-sm font-bold text-[#0a1322] hover:bg-[#dbeafe]">
                Teklif Talep Et
              </a>
              <a href="tel:+902120000000" className="rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-semibold text-white hover:bg-white/20">
                Satış ile Görüş
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-10 text-center text-xs text-[#87a0c2]">
        <p>(c) 2026 MobiBase Cloud Technologies</p>
      </footer>

      <style>{`
        .premium-root {
          background:
            radial-gradient(1000px 540px at 9% -5%, rgba(125, 211, 252, 0.22), transparent 48%),
            radial-gradient(980px 560px at 86% 8%, rgba(196, 181, 253, 0.18), transparent 46%),
            linear-gradient(180deg, #050912 0%, #070e19 45%, #04070f 100%);
        }

        .logo-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background:
            conic-gradient(from 210deg, #7dd3fc, #c4b5fd, #f9a8d4, #7dd3fc);
          box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.35), 0 8px 28px rgba(125, 211, 252, 0.28);
        }

        .hero-wrap {
          isolation: isolate;
        }

        .premium-card {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(165deg, rgba(13, 23, 41, 0.84) 0%, rgba(12, 22, 40, 0.7) 100%);
          box-shadow: 0 26px 70px -28px rgba(14, 165, 233, 0.42);
          backdrop-filter: blur(12px);
        }

        .feature-tile {
          background: linear-gradient(160deg, rgba(16, 25, 44, 0.7) 0%, rgba(8, 16, 30, 0.88) 100%);
          transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease;
        }

        .feature-tile:hover {
          transform: translateY(-4px);
          border-color: rgba(125, 211, 252, 0.45);
          box-shadow: 0 16px 45px -24px rgba(125, 211, 252, 0.45);
        }

        .parallax {
          position: absolute;
          pointer-events: none;
          z-index: -1;
        }

        .orbital-a {
          inset: -16% auto auto -14%;
          width: 58vw;
          height: 58vw;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(125, 211, 252, 0.26), transparent 62%);
          transform: translateY(-8%);
        }

        .orbital-b {
          inset: -12% -18% auto auto;
          width: 52vw;
          height: 52vw;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(196, 181, 253, 0.26), transparent 62%);
          transform: translateY(10%);
        }

        .grid-fx {
          inset: 0;
          opacity: 0.22;
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.25) 1px, transparent 1px);
          background-size: 54px 54px;
          background-attachment: fixed;
        }

        @media (max-width: 900px) {
          .grid-fx {
            background-attachment: scroll;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .parallax {
            transform: none !important;
          }

          .grid-fx {
            background-attachment: scroll !important;
          }

          .feature-tile {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

