"use client";

import { useState } from "react";

export default function StoryPreviewPage() {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const slides = [
    {
      id: "slide-dashboard",
      title: "Yönetim Paneli & Ciro",
      badge: "CANLI PANEL",
      content: (
        <div className="flex flex-col justify-between h-full p-6 text-white bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#030712] relative overflow-hidden">
          {/* Top Ambient Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-blue-600/20 blur-[80px] pointer-events-none" />
          <div className="absolute top-1/3 -right-20 w-60 h-60 rounded-full bg-emerald-500/15 blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-square.png" alt="VibeGSM" className="w-10 h-10 rounded-2xl shadow-xl shadow-blue-500/30 border border-white/20 object-cover" />
                <div>
                  <h2 className="text-xl font-black tracking-tight leading-none">VibeGSM</h2>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Cloud Platform</span>
                </div>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 backdrop-blur-md">
                ● CANLI DEMO
              </span>
            </div>

            <div className="mt-6">
              <span className="inline-block rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-blue-300">
                🚀 GSM BAYİ OTOMASYONU
              </span>
              <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight">
                Telefon Bayinizi <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">Tek Ekrandan</span> Yönetin
              </h1>
            </div>
          </div>

          {/* Main Cards Stack */}
          <div className="relative z-10 my-auto space-y-3.5">
            {/* Stat Card 1 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-4 shadow-xl">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                <span>Aylık Satış Geliri</span>
                <span className="text-emerald-400 font-black">+18.4% ↑</span>
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-white">₺154.846 TL</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" />
              </div>
            </div>

            {/* Stat Card 2 - Bento Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400">Teknik Servis</div>
                <div className="mt-1 text-xl font-black text-white">12 Cihaz</div>
                <div className="mt-1 text-[10px] font-bold text-amber-400">● 4 Parça Bekliyor</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-3.5">
                <div className="text-[11px] font-bold text-slate-400">Envanter Değeri</div>
                <div className="mt-1 text-xl font-black text-white">₺116.260</div>
                <div className="mt-1 text-[10px] font-bold text-blue-400">● IMEI Kayıtlı</div>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {["IMEI Stok Takibi", "Otomatik SMS", "POS Satış", "Cari Veresiye"].map((feat) => (
                <span key={feat} className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black text-slate-200 shadow-sm">
                  ✓ {feat}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="relative z-10 pt-2">
            <a
              href="https://wa.me/905454403452?text=Merhaba,%20VibeGSM%20demo%20talebi%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-sm font-black text-white shadow-xl shadow-[#25D366]/30 transition hover:brightness-110"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.13a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.55-3.7 8.21-8.26 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" /></svg>
              WHATSAPP&apos;TAN DEMO İSTEYİN →
            </a>
          </div>
        </div>
      ),
    },
    {
      id: "slide-service",
      title: "Teknik Servis & SMS",
      badge: "OTOMATİK SMS",
      content: (
        <div className="flex flex-col justify-between h-full p-6 text-white bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#090d16] relative overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-cyan-500/20 blur-[80px] pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-square.png" alt="VibeGSM" className="w-10 h-10 rounded-2xl border border-white/20 object-cover" />
                <div>
                  <h2 className="text-xl font-black leading-none">VibeGSM</h2>
                  <span className="text-[10px] font-bold text-cyan-400">Teknik Servis Otomasyonu</span>
                </div>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[10px] font-black text-cyan-300">
                ⚙️ İŞ EMRİ & SMS
              </span>
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-tight leading-tight">
              Müşterinize Otomatik <br />
              <span className="text-cyan-400">&quot;Tamiriniz Hazır&quot;</span> SMS&apos;i Gönderin
            </h1>
          </div>

          {/* Visual Cards */}
          <div className="relative z-10 my-auto space-y-4">
            {/* Device Repair Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                  ✓ Tamamlandı (Hazır)
                </span>
                <span className="text-[10px] font-bold text-slate-400">Fiş #1182</span>
              </div>
              <h3 className="mt-2 text-base font-black text-white">iPhone 15 Pro Max · 256GB</h3>
              <p className="text-xs text-slate-300 mt-0.5">Orijinal Ekran & Batarya Onarımı</p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                <span className="text-slate-400">Tutar: <strong className="text-white font-black">4.850 TL</strong></span>
                <span className="text-emerald-400 font-bold">SMS Gönderildi ✓</span>
              </div>
            </div>

            {/* Simulated SMS Bubble */}
            <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/80 to-cyan-950/80 p-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-black text-white">
                  SMS
                </div>
                <span className="text-xs font-black text-blue-300">Otomatik Müşteri Bildirimi</span>
              </div>
              <p className="text-xs font-medium text-slate-200 leading-relaxed">
                &quot;Sayın Ahmet Y., #1182 numaralı iPhone 15 Pro cihazınızın tamiri tamamlanmıştır. Mağazamızdan teslim alabilirsiniz.&quot;
              </p>
            </div>
          </div>

          {/* Bottom Button */}
          <div className="relative z-10 pt-2">
            <a
              href="https://wa.me/905454403452?text=Teknik%20servis%20ve%20SMS%20otomasyonu%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/25 transition hover:bg-cyan-400"
            >
              SERVİS OTOMASYONUNU İNCELEYİN →
            </a>
          </div>
        </div>
      ),
    },
    {
      id: "slide-promo",
      title: "Bulut POS & %50 İndirim",
      badge: "ÖZEL FIRSAT",
      content: (
        <div className="flex flex-col justify-between h-full p-6 text-white bg-gradient-to-b from-[#1c0a00] via-[#2a0e05] to-[#090d16] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-500/20 blur-[100px] pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/icon-square.png" alt="VibeGSM" className="w-10 h-10 rounded-2xl border border-white/20 object-cover" />
                <div>
                  <h2 className="text-xl font-black leading-none">VibeGSM</h2>
                  <span className="text-[10px] font-bold text-orange-400">Bulut POS & Satış</span>
                </div>
              </div>
              <span className="rounded-full bg-orange-500/20 border border-orange-500/40 px-3 py-1 text-[10px] font-black text-orange-300 animate-pulse">
                🔥 SINIRLI KONTENJAN
              </span>
            </div>

            {/* Big Promo Badge */}
            <div className="mt-5 rounded-3xl border border-orange-500/40 bg-gradient-to-r from-orange-600 to-red-600 p-5 shadow-2xl text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-100">İLK 20 ŞUBEYE ÖZEL KAMPANYA</span>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">%50 İNDİRİM</h1>
              <div className="mt-2 text-2xl font-black text-orange-100">
                12.000 <span className="text-sm font-bold text-orange-200">TL / yıl</span>
              </div>
            </div>
          </div>

          {/* POS Product Grid Preview */}
          <div className="relative z-10 my-auto space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center">Hızlı POS Satış Kataloğu</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="text-[10px] font-bold text-orange-300">IMEI Kayıtlı</div>
                <div className="text-xs font-black text-white mt-0.5 truncate">iPhone 15 Pro Max</div>
                <div className="text-sm font-black text-emerald-400 mt-1">74.999 ₺</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                <div className="text-[10px] font-bold text-orange-300">IMEI Kayıtlı</div>
                <div className="text-xs font-black text-white mt-0.5 truncate">Galaxy S24 Ultra</div>
                <div className="text-sm font-black text-emerald-400 mt-1">57.999 ₺</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs font-medium text-slate-300">
              ✓ Defter ve Excel kayıtlarınızı ücretsiz taşıyoruz.
            </div>
          </div>

          {/* Bottom Button */}
          <div className="relative z-10 pt-2">
            <a
              href="https://wa.me/905454403452?text=Y%C4%B1ll%C4%B1k%2012.000%20TL%20%2550%20indirimli%20paket%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-600/30 transition hover:brightness-110"
            >
              KONTENJAN KAP - WHATSAPP&apos;TAN YAZ →
            </a>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-10 px-4 font-sans text-slate-100">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black text-white">VibeGSM 9:16 Story Reklam Önizleme</h1>
        <p className="text-xs text-slate-400 mt-1">Yönetim paneli bileşenleriyle oluşturulmuş canlı 9:16 Instagram Story tasarımı</p>

        {/* Tab Controls */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSlide(idx)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
                activeSlide === idx
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {s.badge} - {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* 9:16 Aspect Ratio Phone Canvas Frame */}
      <div className="relative w-[360px] h-[640px] rounded-[40px] border-4 border-slate-700/60 bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Phone Speaker Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-slate-900 z-30 flex items-center justify-center">
          <div className="w-10 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Story Progress Indicators */}
        <div className="absolute top-2 left-4 right-4 z-30 flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  activeSlide === idx ? "w-full" : activeSlide > idx ? "w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Active Slide Content */}
        <div className="w-full h-full pt-4">
          {slides[activeSlide].content}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-500 font-semibold">
        9:16 Instagram Story & TikTok Video Formattadır (1080x1920 px Uyumlu)
      </p>
    </div>
  );
}
