"use client";

import { useMemo, useState } from "react";

const WHATSAPP_HREF =
  "https://wa.me/905454403452?text=" +
  encodeURIComponent("Merhaba, Excel yerine VibeGSM'e geçiş yapmak istiyorum, bilgi almak istiyorum.");

export function RoiCalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [hourlyCost, setHourlyCost] = useState(200);
  const [monthlyLoss, setMonthlyLoss] = useState(3000);
  const [plan, setPlan] = useState<{ label: string; price: number }>({ label: "Pro", price: 1500 });

  const plans = [
    { label: "Lite", price: 750 },
    { label: "Service", price: 990 },
    { label: "Pro", price: 1500 },
    { label: "Enterprise", price: 3500 },
  ];

  const result = useMemo(() => {
    const monthlyTimeCost = hoursPerWeek * 4.33 * hourlyCost;
    const totalMonthlyLoss = monthlyTimeCost + monthlyLoss;
    const netGain = totalMonthlyLoss - plan.price;
    const paybackDays = netGain > 0 ? Math.max(1, Math.round((plan.price / totalMonthlyLoss) * 30) || 1) : null;
    return { monthlyTimeCost, totalMonthlyLoss, netGain, paybackDays };
  }, [hoursPerWeek, hourlyCost, monthlyLoss, plan]);

  function formatTL(n: number) {
    return Math.round(n).toLocaleString("tr-TR") + " TL";
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Hesap Makinesi</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
        Excel size ayda ne kadara mal oluyor?
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
        Aşağıdaki rakamları kendi işletmenize göre ayarlayın; Excel/WhatsApp/deftere harcanan zaman ve
        hatalardan kaynaklanan kayıpların aylık maliyetini görün.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Haftada Excel/stok takibine harcanan saat
              </label>
              <span className="text-sm font-black text-slate-900">{hoursPerWeek} saat</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Saatlik iş gücü maliyetiniz
              </label>
              <span className="text-sm font-black text-slate-900">{formatTL(hourlyCost)}</span>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={25}
              value={hourlyCost}
              onChange={(e) => setHourlyCost(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Aylık tahmini stok hatası / kayıp / unutulan tahsilat
              </label>
              <span className="text-sm font-black text-slate-900">{formatTL(monthlyLoss)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={20000}
              step={500}
              value={monthlyLoss}
              onChange={(e) => setMonthlyLoss(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">VibeGSM Paketi</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {plans.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                    plan.label === p.label
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {p.label} · {formatTL(p.price)}/ay
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-slate-900 p-6 text-white md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Aylık Tahmini Sonuç</p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-300">Excel&apos;e harcanan zamanın maliyeti</span>
              <span className="text-sm font-bold">{formatTL(result.monthlyTimeCost)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-300">Hata/kayıp maliyeti</span>
              <span className="text-sm font-bold">{formatTL(monthlyLoss)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-300">Toplam Excel maliyeti</span>
              <span className="text-sm font-bold text-amber-300">{formatTL(result.totalMonthlyLoss)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs text-slate-300">VibeGSM {plan.label} paketi</span>
              <span className="text-sm font-bold">{formatTL(plan.price)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/[0.08] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-300">Tahmini Aylık Net Kazanç</p>
            <p className="mt-1 text-3xl font-black">
              {result.netGain > 0 ? "+" : ""}
              {formatTL(result.netGain)}
            </p>
            {result.paybackDays !== null && (
              <p className="mt-2 text-xs text-slate-300">
                VibeGSM kendini yaklaşık <strong className="text-white">{result.paybackDays} günde</strong> amorti ediyor.
              </p>
            )}
          </div>

          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
          >
            Bu Rakamları WhatsApp&apos;tan Konuşalım
          </a>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Bu hesaplama, girdiğiniz tahmini rakamlara dayanan bir yaklaşımdır; kesin bir garanti niteliği taşımaz.
      </p>
    </div>
  );
}
