"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/studio/portfolio", tab: "portfolio", label: "Bayi Portföyü", description: "Lisans, CRM ve tenant yönetimi", icon: "BP" },
  { href: "/studio/helpdesk", tab: "helpdesk", label: "Destek Operasyonu", description: "Ticket ve müşteri yanıtları", icon: "DT" },
  { href: "/studio/infrastructure", tab: "infrastructure", label: "Altyapı Analitiği", description: "Şube, API ve kaynak kullanımı", icon: "AA" },
  { href: "/studio/billing", tab: "billing", label: "Finans ve Tahsilat", description: "Cari, vade ve gelir görünümü", icon: "FT" },
  { href: "/studio/pricing", tab: "pricing", label: "Paket ve Fiyatlar", description: "Plan, limit ve sürşarj yönetimi", icon: "PF" },
  { href: "/studio/logs", tab: "logs", label: "Sistem Sağlığı", description: "Loglar ve platform sinyalleri", icon: "SS" },
];

function NavIcon({ active, icon }: { active: boolean; icon: string }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black ${
      active ? "border-indigo-200 bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "border-slate-200 bg-white text-slate-400"
    }`}>
      {icon}
    </span>
  );
}

function StudioLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [telemetry, setTelemetry] = useState({
    cpu: 34.2,
    ram: 14.8,
    traffic: 4850,
    terminals: 5420,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        cpu: Math.max(30, Math.min(50, Number((prev.cpu + (Math.random() - 0.5) * 1.5).toFixed(1)))),
        ram: Math.max(12, Math.min(20, Number((prev.ram + (Math.random() - 0.5) * 0.2).toFixed(1)))),
        traffic: Math.max(4500, Math.min(5205, prev.traffic + Math.round((Math.random() - 0.5) * 60))),
        terminals: Math.max(5350, Math.min(5500, prev.terminals + Math.round((Math.random() - 0.5) * 10))),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (pathname === "/studio/login") {
    return <>{children}</>;
  }

  const currentTab = pathname.split("/")[2] || "portfolio";

  const nav = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = currentTab === item.tab;
        return (
          <Link
            key={item.tab}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all ${
              active
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <NavIcon active={active} icon={item.icon} />
            <span className="min-w-0">
              <span className="block text-sm font-black leading-5">{item.label}</span>
              <span className={`block truncate text-[10px] font-semibold ${active ? "text-slate-500" : "text-slate-500 group-hover:text-slate-300"}`}>
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 md:flex">
      <aside className="hidden w-[292px] shrink-0 border-r border-slate-900/10 bg-[#090d16] p-5 text-white md:flex md:min-h-screen md:flex-col">
        <div className="mb-7 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <img src="/icon-square.png" alt="VibeGSM" className="h-11 w-11 rounded-2xl shadow-lg shadow-indigo-950/30 object-cover" />
            <div>
              <h1 className="text-lg font-black tracking-tight">VibeGSM Studio</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">Platform Yönetimi</p>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Oturum</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-blue-400 text-sm font-black">SA</div>
            <div>
              <p className="text-sm font-black">SuperAdmin</p>
              <p className="text-xs text-slate-400">Reseller operasyon yetkilisi</p>
            </div>
          </div>
        </div>

        <div className="flex-1">{nav}</div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Platform Özeti</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-400/10 px-2 py-1 text-[9px] font-black text-slate-400">
              Demo
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-400">
                <span>Şube kapasitesi</span>
                <span>620 / 1000</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 w-[62%] rounded-full bg-indigo-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-slate-500">API trafiği</p>
                <p className="mt-1 font-mono font-black text-white">{telemetry.traffic.toLocaleString()} req/m</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-slate-500">Terminaller</p>
                <p className="mt-1 font-mono font-black text-white">{telemetry.terminals.toLocaleString()} POS</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-slate-500">CPU</p>
                <p className="mt-1 font-mono font-black text-white">%{telemetry.cpu}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-slate-500">RAM</p>
                <p className="mt-1 font-mono font-black text-white">{telemetry.ram} GB</p>
              </div>
            </div>
          </div>
        </div>

        <Link href="/" className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white">
          Bayi arayüzüne dön
        </Link>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">VibeGSM Studio</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Platform Yönetimi</p>
          </div>
          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700"
            aria-label="Studio menüsünü aç"
          >
            {mobileOpen ? "Kapat" : "Menü"}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-b border-slate-200 bg-[#07111f] p-4 text-white md:hidden">
          {nav}
          <Link href="/" onClick={() => setMobileOpen(false)} className="mt-3 block rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300">
            Bayi arayüzüne dön
          </Link>
        </div>
      )}

      <main className="min-w-0 flex-1 p-5 md:p-8 xl:p-10">{children}</main>
    </div>
  );
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    }>
      <StudioLayoutContent>{children}</StudioLayoutContent>
    </Suspense>
  );
}
