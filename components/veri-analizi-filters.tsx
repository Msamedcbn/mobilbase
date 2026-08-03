"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Period = "day" | "week" | "month" | "all";

const PRESETS: { key: Period; label: string }[] = [
  { key: "day", label: "Günlük" },
  { key: "week", label: "Haftalık" },
  { key: "month", label: "Aylık" },
  { key: "all", label: "Tümü" },
];

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function VeriAnaliziFilters({
  selectedPeriod,
  isCustomRange,
  fromValue,
  toValue,
  compareEnabled,
}: {
  selectedPeriod: Period;
  isCustomRange: boolean;
  fromValue: string;
  toValue: string;
  compareEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(isCustomRange);
  const [from, setFrom] = useState(fromValue);
  const [to, setTo] = useState(toValue || toInputDate(new Date()));
  const [compare, setCompare] = useState(compareEnabled);

  function goToPreset(period: Period) {
    setShowCustom(false);
    router.push(`/veri-analizi?period=${period}`);
  }

  function goToQuickCompare(kind: "week" | "year") {
    setShowCustom(false);
    const today = new Date();
    let start: Date;
    if (kind === "week") {
      // Monday of the current week.
      const day = today.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
    } else {
      start = new Date(today.getFullYear(), 0, 1);
    }
    const params = new URLSearchParams();
    params.set("from", toInputDate(start));
    params.set("to", toInputDate(today));
    params.set("compare", "1");
    router.push(`/veri-analizi?${params.toString()}`);
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    if (!from) return;
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to || toInputDate(new Date()));
    if (compare) params.set("compare", "1");
    router.push(`/veri-analizi?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => goToPreset(p.key)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                !showCustom && selectedPeriod === p.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            showCustom ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          📅 Manuel Tarih Aralığı
        </button>
        <button
          type="button"
          onClick={() => goToQuickCompare("week")}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          📈 Bu Hafta vs Geçen Hafta
        </button>
        <button
          type="button"
          onClick={() => goToQuickCompare("year")}
          className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          📈 Bu Yıl vs Geçen Yıl
        </button>
      </div>

      {showCustom && (
        <form onSubmit={applyCustomRange} className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Başlangıç</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="field text-xs py-1.5 px-2"
              style={{ width: "9.5rem" }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bitiş</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="field text-xs py-1.5 px-2"
              style={{ width: "9.5rem" }}
            />
          </div>
          <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
            />
            Önceki eşdeğer dönemle karşılaştır
          </label>
          <button type="submit" className="primary-btn text-xs py-1.5 px-4">
            Uygula
          </button>
        </form>
      )}
    </div>
  );
}
