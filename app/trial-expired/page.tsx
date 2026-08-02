"use client";

import { useState, useEffect } from "react";

export default function TrialExpiredPage() {
  const [shopName, setShopName] = useState("Bayi");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d.user?.fullName) setShopName(d.user.fullName);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#030712] to-[#06101e] px-5">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/20">
          <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white md:text-4xl">Deneme Süreniz Doldu</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {shopName} için 14 günlük ücretsiz deneme süresi sona erdi. Verileriniz 30 gün boyunca saklanır.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-bold text-white">VibeGSM ile devam etmek için</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Size uygun paket, şube yapısı ve veri geçişi için bizimle iletişime geçin. Aynı gün kuruluma başlayalım.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="https://wa.me/905454403452?text=Merhaba,%20VibeGSM%20deneme%20s%C3%BCremi%20uzatmak/abonelik%20ba%C5%9Flatmak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#25D366] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-105"
            >
              WhatsApp ile Abonelik Alın
            </a>
            <a
              href="tel:+905454403452"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Hemen Ara: 0545 440 34 52
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Hesabınızla ilgili sorularınız için WhatsApp hattımızdan veya telefonla ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
