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
    { key: "Lite", subtitle: "Küçük bayi için temel kontrol" },
    { key: "Service", subtitle: "Teknik servis ağırlıklı işletmeler" },
    { key: "Pro", subtitle: "Satış, stok ve finansı birlikte yönetin", badge: "Önerilen" },
    { key: "Enterprise", subtitle: "Çok şubeli bayi ve SLA ihtiyacı" },
  ];

  const featureNames: Array<{ key: "pos" | "repairs" | "stock" | "invoicing" | "buyback"; label: string }> = [
    { key: "pos", label: "POS" },
    { key: "repairs", label: "Teknik servis" },
    { key: "stock", label: "Stok" },
    { key: "invoicing", label: "Faturalama" },
    { key: "buyback", label: "İkinci el" },
  ];

  const painPoints = [
    { label: "WhatsApp", detail: "Servis notları ve müşteri mesajları kaybolur." },
    { label: "Excel", detail: "Stok, maliyet ve kâr geriden takip edilir." },
    { label: "Defter", detail: "Veresiye ve tahsilat riski geç fark edilir." },
    { label: "Dağınık POS", detail: "Satış sonrası stok ve finans ayrışır." },
  ];

  const modules = [
    ["Satış ve POS", "Satılan cihaz, aksesuar, ödeme ve kâr aynı işlemde kapanır."],
    ["Teknik Servis", "Kabulden teslime kadar cihaz, müşteri ve işlem adımları izlenir."],
    ["Stok ve Seri No", "Ürün, varyant, maliyet, şube ve seri numarası görünür kalır."],
    ["Tahsilat ve Finans", "Veresiye, vade, gider ve tahsilat riski yönetilebilir hale gelir."],
    ["İkinci El / Buyback", "Alım, servis transferi ve satışa hazır stok tek akışta bağlanır."],
    ["Şube Yönetimi", "Büyüdükçe kullanıcı, şube ve yetki kontrolü aynı sistemde kalır."],
  ];

  const workflowSteps = [
    ["01", "Dağınık kayıtları topla", "Servis, satış, stok ve müşteri bilgisi tek bayi hafızasında birleşir."],
    ["02", "Operasyon akışına çevir", "Her işlem duruma, sorumluya, cihaza ve finans etkisine bağlanır."],
    ["03", "Kontrol panelinden yönet", "Bayi sahibi bugün ne satıldı, ne bekliyor, ne riskli anında görür."],
  ];

  const proofItems = [
    "Servis süreci kaybolmaz",
    "Stok ve seri no görünür",
    "Tahsilat riski erkenden çıkar",
    "Şube kontrolü merkezileşir",
  ];

  return (
    <div className="landing-root min-h-screen overflow-hidden text-[#eef6ff]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050914]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="MobiBase ana sayfa">
            <div className="brand-mark" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">MobiBase</p>
              <p className="text-sm font-black tracking-tight text-white">Bayi Otomasyonu</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a href="#sorun" className="hover:text-white">Sorun</a>
            <a href="#cozum" className="hover:text-white">Çözüm</a>
            <a href="#paketler" className="hover:text-white">Paketler</a>
            <a href="#iletisim" className="hover:text-white">Demo</a>
          </nav>
          <Link href="/login" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white/15">
            Müşteri Girişi
          </Link>
        </div>
      </header>

      <main>
        <section id="sorun" className="landing-hero relative px-5 pb-16 pt-32 md:px-8 md:pb-24 md:pt-36">
          <div className="noise-layer" aria-hidden />
          <div className="hero-orb hero-orb-left" aria-hidden />
          <div className="hero-orb hero-orb-right" aria-hidden />

          <div className="hero-grid relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="hero-copy">
              <p className="mb-5 inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Telefon bayileri için tek operasyon sistemi
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white md:text-6xl xl:text-7xl">
                Excel, WhatsApp ve defter karmaşasını
                <span className="block text-cyan-200">tek bayi sisteminde bitirin.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                MobiBase; satış, teknik servis, stok, ikinci el ve tahsilatı aynı akışta toplayan telefon bayi otomasyonudur.
                Bayi sahibi ne satıldı, hangi cihaz bekliyor, nerede para riski var tek ekrandan görür.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#iletisim" className="rounded-full bg-cyan-200 px-7 py-3 text-sm font-black text-[#06111f] transition hover:bg-white">
                  Demo ve Geçiş Planı Al
                </a>
                <a href="#cozum" className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  Sistemi Gör
                </a>
              </div>
            </div>

            <div className="hero-board rounded-[34px] p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Dağınık süreçten net kontrole</p>
                  <p className="mt-1 text-sm text-slate-300">Bayi operasyon haritası</p>
                </div>
                <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-black text-emerald-100">Canlı</span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.9fr_auto_1.1fr] lg:items-center">
                <div className="space-y-3">
                  {painPoints.map((item, index) => (
                    <div key={item.label} className="signal-card rounded-2xl border border-red-200/15 bg-red-200/[0.06] p-4" style={{ animationDelay: `${index * 110}ms` }}>
                      <p className="text-sm font-black text-white">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="hidden h-full items-center justify-center lg:flex">
                  <div className="flow-arrow">→</div>
                </div>

                <div className="control-panel rounded-[28px] border border-cyan-100/20 bg-[#071526]/90 p-5 shadow-2xl shadow-cyan-950/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">MobiBase Kontrol</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Bugünün bayi durumu</h2>
                    </div>
                    <div className="rounded-2xl bg-cyan-200 px-3 py-2 text-sm font-black text-[#06111f]">92%</div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[
                      ["Servis", "46 kayıt"],
                      ["Satış", "18 işlem"],
                      ["Stok", "1.284 ürün"],
                      ["Risk", "11 vade"],
                    ].map(([title, value]) => (
                      <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs text-slate-400">{title}</p>
                        <p className="mt-1 text-lg font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-200/15 bg-emerald-200/[0.07] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-emerald-100">Teslime hazır cihazlar</p>
                      <span className="text-lg font-black text-white">23</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[72%] rounded-full bg-emerald-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-10 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 border-y border-white/10 py-5 md:grid-cols-4">
            {proofItems.map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-200">
                <span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(165,243,252,0.8)]" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="cozum" className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Çözüm</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white md:text-5xl">
                Bayinin günlük işini tek işletim sistemine bağlar.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                MobiBase ayrı ayrı çalışan kayıtları birleştirir. Her satış, servis kaydı, stok hareketi ve tahsilat etkisi aynı müşteri ve cihaz geçmişinde okunur.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {modules.map(([title, description], index) => (
                <article key={title} className="module-row rounded-3xl border border-white/10 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-200/80">Modül {String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-xl font-black tracking-tight text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="sticky-copy">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Dönüşüm</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white md:text-5xl">
                Dağınık kayıt değil, yönetilebilir akış.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Amaç sadece veri girmek değil; bayi sahibine karar vereceği temiz tabloyu vermek.
              </p>
            </div>

            <div className="workflow-line space-y-4">
              {workflowSteps.map(([step, title, description]) => (
                <article key={step} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                  <div className="flex gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-200 text-sm font-black text-[#06111f]">{step}</span>
                    <div>
                      <h3 className="text-xl font-black text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="paketler" className="px-5 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Paketler</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white md:text-5xl">Bayi ölçeğine göre başlayın.</h2>
                <p className="mt-3 text-sm text-slate-300">Tüm fiyatlar aylıktır. Yıllık ödemede %{addons.annualDiscountPct} indirim uygulanır.</p>
              </div>
              <a href="#iletisim" className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Teklif Al
              </a>
            </div>

            <div className="mt-9 grid gap-5 lg:grid-cols-4">
              {plans.map((plan) => {
                const featureConfig = (pricing.features as any)?.[plan.key] || {};
                const amount = Number((pricing as any)[plan.key] || 0);
                const highlighted = Boolean(plan.badge);

                return (
                  <article
                    key={plan.key}
                    className={`price-card rounded-3xl border p-6 ${
                      highlighted
                        ? "border-cyan-200/50 bg-cyan-200/[0.09] shadow-[0_20px_70px_-35px_rgba(165,243,252,0.75)]"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex min-h-[72px] items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-white">{plan.key}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{plan.subtitle}</p>
                      </div>
                      {highlighted ? <span className="rounded-full bg-cyan-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#06111f]">{plan.badge}</span> : null}
                    </div>

                    <div className="mt-5 text-4xl font-black tracking-tight text-white">{amount.toLocaleString("tr-TR")} TL</div>
                    <p className="text-xs text-slate-400">Aylık lisans</p>

                    <div className="mt-6 space-y-2 text-xs text-slate-200">
                      {featureNames.map((feature) => (
                        <div key={feature.key} className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span>{feature.label}</span>
                          <span className={featureConfig[feature.key] ? "text-emerald-200" : "text-slate-500"}>{featureConfig[feature.key] ? "Var" : "Yok"}</span>
                        </div>
                      ))}
                      <p className="pt-2 text-cyan-100">Destek: {featureConfig.supportLevel || "Standart"}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-7 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300 md:grid-cols-3">
              <div>Ek 10.000 API: <strong className="text-white">{addons.apiPackPrice} TL</strong></div>
              <div>Ek 1 GB veritabanı: <strong className="text-white">{addons.dbGbPrice} TL</strong></div>
              <div>Ek şube: <strong className="text-white">{pricing.branchSurchargePrice} TL / ay</strong></div>
            </div>
          </div>
        </section>

        <section id="iletisim" className="px-5 pb-20 pt-10 md:px-8">
          <div className="cta-panel mx-auto max-w-5xl rounded-[36px] border border-cyan-100/20 p-8 text-center md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Demo ve geçiş planı</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black tracking-[-0.035em] text-white md:text-5xl">
              Bayinizdeki dağınık süreci birlikte haritalayalım.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Size uygun paket, veri geçişi, şube yapısı ve kurulum adımlarını aynı gün netleştirelim.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="mailto:satis@mobibase.com?subject=MobiBase%20Teklif%20Talebi" className="rounded-full bg-cyan-200 px-7 py-3 text-sm font-black text-[#06111f] transition hover:bg-white">
                Teklif Talep Et
              </a>
              <a href="tel:+902120000000" className="rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Satış ile Görüş
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 pb-10 text-center text-xs text-slate-500">
        <p>© 2026 MobiBase Cloud Technologies</p>
      </footer>

      <style>{`
        .landing-root {
          background:
            radial-gradient(980px 580px at 6% -6%, rgba(103, 232, 249, 0.18), transparent 52%),
            radial-gradient(880px 560px at 92% 8%, rgba(14, 165, 233, 0.16), transparent 48%),
            linear-gradient(180deg, #030712 0%, #06101e 46%, #030712 100%);
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.75), transparent 36%),
            linear-gradient(135deg, #67e8f9 0%, #0891b2 45%, #0f172a 100%);
          box-shadow: 0 14px 40px -18px rgba(103, 232, 249, 0.9), inset 0 0 18px rgba(255, 255, 255, 0.24);
        }

        .landing-hero {
          min-height: 100svh;
          isolation: isolate;
        }

        .noise-layer {
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0.18;
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.22) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 76%);
        }

        .hero-orb {
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          filter: blur(4px);
          pointer-events: none;
        }

        .hero-orb-left {
          left: -18%;
          top: 10%;
          width: 44vw;
          height: 44vw;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.2), transparent 62%);
        }

        .hero-orb-right {
          right: -16%;
          top: 2%;
          width: 48vw;
          height: 48vw;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.18), transparent 62%);
        }

        .hero-copy {
          animation: heroIn 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .hero-board {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.78), rgba(3, 7, 18, 0.86));
          box-shadow: 0 30px 100px -45px rgba(34, 211, 238, 0.55);
          backdrop-filter: blur(18px);
          animation: boardIn 760ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
        }


        .signal-card {
          animation: signalDrift 4.8s ease-in-out infinite;
        }

        .flow-arrow {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 999px;
          background: rgba(165, 243, 252, 0.12);
          border: 1px solid rgba(165, 243, 252, 0.22);
          color: #cffafe;
          font-size: 28px;
          font-weight: 900;
        }

        .module-row,
        .price-card {
          background: linear-gradient(155deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.78));
          transition: transform 240ms ease, border-color 240ms ease, background 240ms ease;
        }

        .module-row:hover,
        .price-card:hover {
          transform: translateY(-4px);
          border-color: rgba(165, 243, 252, 0.35);
          background: linear-gradient(155deg, rgba(15, 23, 42, 0.86), rgba(8, 47, 73, 0.42));
        }

        .sticky-copy {
          position: sticky;
          top: 112px;
        }

        .workflow-line {
          position: relative;
          border-left: 1px solid rgba(165, 243, 252, 0.22);
          padding-left: 24px;
        }

        .cta-panel {
          background:
            radial-gradient(520px 260px at 50% 0%, rgba(103, 232, 249, 0.18), transparent 70%),
            linear-gradient(155deg, rgba(8, 47, 73, 0.8), rgba(15, 23, 42, 0.82));
          box-shadow: 0 24px 90px -42px rgba(103, 232, 249, 0.72);
        }

        @keyframes heroIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes boardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes signalDrift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @media (max-width: 1023px) {
          .landing-hero {
            min-height: auto;
          }

          .sticky-copy {
            position: static;
          }

          .workflow-line {
            border-left: 0;
            padding-left: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-copy,
          .hero-board,
          .signal-card,
          .module-row,
          .price-card {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
