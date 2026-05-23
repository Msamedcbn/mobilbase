export const dynamic = "force-dynamic";

import { readLocalStore } from "@/lib/local-store";
import Link from "next/link";

export default async function LandingPage() {
  const store = await readLocalStore();
  const pricing = store.resellerPricing || {
    Lite: 750,
    Pro: 1500,
    Enterprise: 3500,
    freeBranchLimit: 5,
    branchSurchargePrice: 150,
    addons: {
      apiPackPrice: 150,
      dbGbPrice: 200,
      customDevHourly: 1200,
      annualDiscountPct: 15
    },
    features: {
      Lite: {
        pos: true,
        repairs: true,
        stock: false,
        invoicing: false,
        buyback: false,
        supportLevel: "Standart E-Posta Destek"
      },
      Pro: {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: false,
        supportLevel: "Hızlı Destek (Mesai Saatleri)"
      },
      Enterprise: {
        pos: true,
        repairs: true,
        stock: true,
        invoicing: true,
        buyback: true,
        supportLevel: "7/24 Telefon & SLA Desteği"
      }
    }
  };

  const addons = pricing.addons || {
    apiPackPrice: 150,
    dbGbPrice: 200,
    customDevHourly: 1200,
    annualDiscountPct: 15
  };

  const features = pricing.features || {
    Lite: { pos: true, repairs: true, stock: false, invoicing: false, buyback: false, supportLevel: "Standart E-Posta Destek" },
    Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hızlı Destek (Mesai Saatleri)" },
    Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 Telefon & SLA Desteği" }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-850 selection:bg-amber-200 selection:text-stone-900 font-sans antialiased relative overflow-x-hidden">
      
      {/* Delicate organic gradient background overlay */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-gradient-to-b from-[#F2EFE9] to-transparent opacity-60 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[600px] bg-gradient-to-b from-[#EFECE6]/40 to-transparent opacity-40 blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-stone-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center shadow-md shadow-stone-900/10 group-hover:scale-105 transition-transform duration-300">
              <svg className="w-5 h-5 text-[#FAF9F5]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-stone-900">
              MobiBase <span className="text-[10px] font-semibold text-stone-600 bg-stone-200/60 border border-stone-300 px-2 py-0.5 rounded-full ml-1">Cloud</span>
            </span>
          </Link>

          {/* Hidden Checkbox for CSS-Only Mobile Menu Toggle */}
          <input type="checkbox" id="mobile-menu-toggle" className="peer hidden" />

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#features" className="hover:text-stone-900 transition-colors">Özellikler</a>
            <a href="#pricing" className="hover:text-stone-900 transition-colors">Fiyatlandırma</a>
            <a href="#about" className="hover:text-stone-900 transition-colors">Hakkımızda</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="hidden sm:inline-block px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF9F5] font-semibold text-sm shadow-md hover:shadow-stone-900/10 active:scale-[0.98] transition-all duration-300"
            >
              Firma Girişi 🔑
            </Link>

            {/* Mobile Menu Label Button */}
            <label 
              htmlFor="mobile-menu-toggle" 
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 cursor-pointer select-none rounded-xl hover:bg-stone-100 transition-colors"
              aria-label="Menüyü Aç"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          </div>

          {/* Mobile Menu Dropdown Panel */}
          <div className="hidden peer-checked:flex md:hidden flex-col gap-4 absolute top-full left-0 right-0 mt-2 p-6 bg-[#FAF9F5] border border-stone-200 rounded-2xl shadow-xl z-50">
            <a href="#features" className="text-sm font-semibold text-stone-600 hover:text-stone-900 py-2 border-b border-stone-100">Özellikler</a>
            <a href="#pricing" className="text-sm font-semibold text-stone-600 hover:text-stone-900 py-2 border-b border-stone-100">Fiyatlandırma</a>
            <a href="#about" className="text-sm font-semibold text-stone-600 hover:text-stone-900 py-2 border-b border-stone-100">Hakkımızda</a>
            <Link 
              href="/login" 
              className="sm:hidden text-center px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF9F5] font-semibold text-sm shadow-md"
            >
              Firma Girişi 🔑
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200/80 text-xs text-stone-700 font-semibold uppercase tracking-wider">
            <span>🛡️</span> Telefon Bayileri İçin Kurumsal Bulut Platformu
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-stone-900 max-w-4xl mx-auto">
            Dükkanınızı Modern Bulut Otomasyonu <br className="hidden sm:inline" />
            <span className="italic font-serif font-normal text-stone-800 bg-gradient-to-r from-stone-900 via-amber-800 to-stone-900 bg-clip-text text-transparent">
              MobiBase
            </span>{" "}
            İle Yönetin
          </h1>
          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Müşteri kayıtları, cihaz teknik servisi, parça ve onarım fiyat matrisi, çoklu şube transferleri ve detaylı kasa muhasebe işlemlerini tek panelden güvenle yönetin.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <a 
              href="#pricing" 
              className="w-full sm:w-auto px-8 py-4 bg-white border border-stone-200 hover:border-stone-400 text-stone-850 font-semibold rounded-2xl hover:bg-stone-50 shadow-sm transition-all duration-300"
            >
              Paketleri İncele 👇
            </a>
            <Link 
              href="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-stone-900 hover:bg-stone-800 text-[#FAF9F5] font-semibold rounded-2xl shadow-lg shadow-stone-900/10 hover:shadow-stone-900/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Hemen Giriş Yap
            </Link>
          </div>

          {/* Promo Card replacing the neon mock box */}
          <div className="pt-16 max-w-4xl mx-auto">
            <div className="relative rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-900/[0.03]">
              <div className="bg-[#FAF9F5] rounded-2xl border border-stone-100 p-5 sm:p-8 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-left space-y-2.5 max-w-lg">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
                    <span className="text-amber-700">💼</span> RESELLER YÖNETİMİ
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">Merkezi Yönetim ve Studio Entegrasyonu</h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
                    Sistem yöneticileri reseller `/studio` panelinden yeni lisanslar atayabilir, şube limitlerini, API kotalarını ve veritabanı boyutlarını dinamik olarak yönetebilir.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 justify-center md:justify-end">
                  <span className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-sm">🏪 Multi-Şube Destek</span>
                  <span className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-sm">🔧 Arıza & Servis</span>
                  <span className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-sm">💸 POS & Taksitler</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services / Features Section */}
      <section id="features" className="py-24 border-t border-stone-200/80 bg-[#F5F2EB]/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-widest pl-1">Yetenekler</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">MobiBase Hizmet Modülleri</h2>
            <p className="text-stone-600 text-sm max-w-xl mx-auto leading-relaxed">
              Telefon bayiniz için özel olarak optimize edilmiş, işinizi kolaylaştıran gelişmiş modül grupları.
            </p>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 space-y-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 text-xl font-bold">
                🛒
              </div>
              <h3 className="text-lg font-bold text-stone-900">Hızlı POS Satışı</h3>
              <p className="text-xs sm:text-sm text-stone-650 leading-relaxed font-normal">
                Tüm barkodlu ürünleri anında sepete ekleyin, peşin, kredi kartı veya veresiye tahsilat yöntemleriyle satışı tamamlayın.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 space-y-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 text-xl font-bold">
                🔧
              </div>
              <h3 className="text-lg font-bold text-stone-900">Teknik Servis</h3>
              <p className="text-xs sm:text-sm text-stone-650 leading-relaxed font-normal">
                Gelen arızalı cihazları IMEI ve Seri No ile kaydedin, aşama aşama durum güncellemesi yapın ve onarım bedelini kasaya aktarın.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 space-y-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 text-xl font-bold">
                📦
              </div>
              <h3 className="text-lg font-bold text-stone-900">Stok & Transfer</h3>
              <p className="text-xs sm:text-sm text-stone-650 leading-relaxed font-normal">
                Kategori ve asgari limit bazlı stok takibi yapın. Şubeler arası güvenli stok transfer günlüklerini tutarlı şekilde yönetin.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-2xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 space-y-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 text-xl font-bold">
                📈
              </div>
              <h3 className="text-lg font-bold text-stone-900">Cari & Taksit</h3>
              <p className="text-xs sm:text-sm text-stone-650 leading-relaxed font-normal">
                Müşterilerinizin borç ve veresiye limitlerini belirleyin, taksitli satışlar oluşturun ve vade tarihlerine göre planlama yapın.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Dynamic Pricing Section */}
      <section id="pricing" className="py-24 border-t border-stone-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-widest pl-1">Fiyatlandırma</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">Kullanım Paketleri & Fiyatlandırma</h2>
            <p className="text-stone-600 text-sm max-w-xl mx-auto leading-relaxed">
              Dükkanınızın boyutuna ve ihtiyaçlarına en uygun lisans paketini seçin. Yıllık alımlarda <span className="text-amber-800 font-bold">%15 indirim</span> avantajından yararlanın.
            </p>
          </div>

          <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto">
            
            {/* Lite Plan */}
            <div className="relative rounded-3xl border border-stone-200 bg-white p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Lite Paket</h3>
                  <p className="text-xs text-stone-500 mt-1">Başlangıç aşamasındaki tek şubeli telefoncular için</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-900">{pricing.Lite.toLocaleString()} TL</span>
                  <span className="text-xs text-stone-500 font-semibold">/ ay</span>
                </div>
                
                <div className="border-t border-stone-100 pt-6">
                  <ul className="space-y-3.5 text-xs sm:text-sm text-stone-600">
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm font-bold">✓</span> 
                      <span>Dahil Şube Limiti: <strong className="text-stone-950">{pricing.freeBranchLimit} Şube</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Lite.pos ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Hızlı POS Satış Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Lite.repairs ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Arıza & Teknik Servis Kaydı</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Lite.stock ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Stok & Transfer Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Lite.invoicing ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Fatura Kesme Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm">ℹ</span>
                      <span>Destek Seviyesi: <strong className="text-stone-950">{features.Lite.supportLevel}</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="pt-8">
                <Link href="/login" className="block text-center w-full py-3 rounded-xl bg-stone-100 hover:bg-stone-200/60 border border-stone-200 text-xs sm:text-sm font-semibold text-stone-850 transition-all">
                  Hemen Başla ⚡
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-3xl border-2 border-stone-900 bg-white p-8 shadow-xl flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-stone-900 text-[#FAF9F5] text-[10px] font-bold uppercase tracking-wider shadow">
                En Popüler
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Pro Paket</h3>
                  <p className="text-xs text-stone-500 mt-1">Büyümekte olan çok şubeli bayiler için en ideal çözüm</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-900">{pricing.Pro.toLocaleString()} TL</span>
                  <span className="text-xs text-stone-500 font-semibold">/ ay</span>
                </div>
                
                <div className="border-t border-stone-100 pt-6">
                  <ul className="space-y-3.5 text-xs sm:text-sm text-stone-600">
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm font-bold">✓</span> 
                      <span>Dahil Şube Limiti: <strong className="text-stone-950">{pricing.freeBranchLimit} Şube</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Pro.pos ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Hızlı POS Satış Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Pro.repairs ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Arıza & Teknik Servis Kaydı</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Pro.stock ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Stok & Transfer Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Pro.invoicing ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Fatura Kesme Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm">ℹ</span>
                      <span>Destek Seviyesi: <strong className="text-stone-950">{features.Pro.supportLevel}</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="pt-8">
                <Link href="/login" className="block text-center w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-[#FAF9F5] font-semibold text-xs sm:text-sm transition-all shadow-md">
                  {"Pro'ya Geç 🚀"}
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-3xl border border-stone-200 bg-white p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Enterprise Paket</h3>
                  <p className="text-xs text-stone-500 mt-1">Özel geliştirme ve tam teknik altyapı arayanlar için</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-stone-900">{pricing.Enterprise.toLocaleString()} TL</span>
                  <span className="text-xs text-stone-500 font-semibold">/ ay</span>
                </div>
                
                <div className="border-t border-stone-100 pt-6">
                  <ul className="space-y-3.5 text-xs sm:text-sm text-stone-600">
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm font-bold">✓</span> 
                      <span>Dahil Şube Limiti: <strong className="text-stone-950">{pricing.freeBranchLimit} Şube</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Enterprise.pos ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Hızlı POS Satış Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Enterprise.repairs ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Arıza & Teknik Servis Kaydı</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Enterprise.stock ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Stok & Transfer Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {features.Enterprise.invoicing ? <span className="text-stone-900 text-sm font-bold">✓</span> : <span className="text-stone-400 text-sm">✗</span>}
                      <span>Fatura Kesme Modülü</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-stone-900 text-sm">ℹ</span>
                      <span>Destek Seviyesi: <strong className="text-stone-950">{features.Enterprise.supportLevel}</strong></span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="pt-8">
                <Link href="/login" className="block text-center w-full py-3 rounded-xl bg-stone-100 hover:bg-stone-200/60 border border-stone-200 text-xs sm:text-sm font-semibold text-stone-850 transition-all">
                  İletişime Geç 📞
                </Link>
              </div>
            </div>

          </div>

          {/* Add-ons table info */}
          <div className="mt-16 max-w-3xl mx-auto bg-[#F5F2EB]/50 border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
              <span>➕</span> Ekstra Limit Paketleri & Eklentiler
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm">
                <p className="text-stone-500 font-medium">Ekstra 10.000 API Kotası</p>
                <p className="text-base font-bold text-stone-900 mt-1">{addons.apiPackPrice} TL / ay</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm">
                <p className="text-stone-500 font-medium">Ekstra 1 GB Disk Alanı</p>
                <p className="text-base font-bold text-stone-900 mt-1">{addons.dbGbPrice} TL / ay</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-sm">
                <p className="text-stone-500 font-medium">Özel Geliştirme Hizmeti</p>
                <p className="text-base font-bold text-stone-900 mt-1">{addons.customDevHourly} TL / saat</p>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-stone-500 text-center font-medium">
              * Dahil şube sınırının aşılması durumunda, ek şube başına aylık <strong className="text-stone-700">{pricing.branchSurchargePrice} TL</strong> şube sürşarjı uygulanır.
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 border-t border-stone-200/80 bg-[#F5F2EB]/50">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-widest pl-1">Hakkımızda</span>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight">MobiBase Cloud Technologies</h2>
          <p className="text-stone-650 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            MobiBase, modern telefon bayileri ve teknik servis noktaları için geliştirilmiş yüksek performanslı, bulut tabanlı bir yönetim yazılımıdır. İş süreçlerinizi dijitalleştirerek şubeleriniz arasındaki koordinasyonu güçlendirir ve operasyonel verimliliğinizi en üst düzeye çıkarır.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-12 px-6 text-xs text-stone-500 text-center">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="font-bold text-stone-700">
            © 2026 MobiBase Cloud Technologies. Tüm Hakları Saklıdır.
          </p>
          <p className="max-w-md mx-auto leading-relaxed">
            MobiBase, telefon bayileri ve distribütör firmalar için özelleştirilmiş, çoklu şube destekli modern bir bulut SaaS otomasyon ürünüdür.
          </p>
        </div>
      </footer>

    </div>
  );
}
