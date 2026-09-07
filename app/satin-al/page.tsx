"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DirectPurchaseForm } from "@/components/direct-purchase-form";
import { PLAN_NAME, PLAN_PRICE_TRY, ANNUAL_DISCOUNT_PCT, type BillingCycle } from "@/lib/subscription-plans";

function Content() {
  const params = useSearchParams();
  const cycleParam = params.get("cycle");
  const cycle: BillingCycle = cycleParam === "annual" ? "annual" : "monthly";
  const price = PLAN_PRICE_TRY[cycle];

  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#030712] px-4 py-16" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(59,130,246,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(59,130,246,0.06),transparent_45%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex flex-col items-center text-center gap-3">
            <img src="/icon-square.png" alt="VibeGSM" className="h-12 w-12 rounded-2xl shadow-lg shadow-blue-500/25 object-cover" />
            <div>
              <h1 className="text-xl font-black text-white md:text-2xl">Doğrudan Satın Al</h1>
              <p className="mt-1.5 text-sm text-slate-300">
                {PLAN_NAME} — <span className="font-bold text-white">₺{price.toLocaleString("tr-TR")}</span>
                {cycle === "monthly" ? " / ay" : ` / yıl (%${ANNUAL_DISCOUNT_PCT} indirimli)`}
              </p>
            </div>
          </div>

          <DirectPurchaseForm cycle={cycle} className="mt-6" />

          <p className="mt-6 text-center text-xs text-slate-500">
            Önce ücretsiz denemek mi istiyorsunuz? <a href="/kayit" className="font-bold text-blue-400 hover:text-blue-300">7 gün ücretsiz deneyin</a>
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            Zaten hesabınız var mı? <a href="/login" className="font-bold text-blue-400 hover:text-blue-300">Giriş yapın</a>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function SatinAlPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030712]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />
      </div>
    }>
      <Content />
    </Suspense>
  );
}
