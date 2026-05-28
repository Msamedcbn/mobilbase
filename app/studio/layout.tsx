"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function StudioLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [telemetry, setTelemetry] = useState({
    cpu: 34.2,
    ram: 14.8,
    traffic: 4850,
    terminals: 5420
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => {
        const cpuChange = (Math.random() - 0.5) * 1.5;
        const ramChange = (Math.random() - 0.5) * 0.2;
        const trafficChange = Math.round((Math.random() - 0.5) * 60);
        const terminalChange = Math.round((Math.random() - 0.5) * 10);
        return {
          cpu: Math.max(30, Math.min(50, parseFloat((prev.cpu + cpuChange).toFixed(1)))),
          ram: Math.max(12, Math.min(20, parseFloat((prev.ram + ramChange).toFixed(1)))),
          traffic: Math.max(4500, Math.min(5205, prev.traffic + trafficChange)),
          terminals: Math.max(5350, Math.min(5500, prev.terminals + terminalChange))
        };
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (pathname === "/studio/login") {
    return <>{children}</>;
  }

  const currentTab = searchParams.get("tab") || "portfolio";

  const navItems = [
    {
      href: "/studio?tab=portfolio",
      tab: "portfolio",
      label: "Bayi ve Firma Yönetimi",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      href: "/studio?tab=helpdesk",
      tab: "helpdesk",
      label: "Destek Masası (Helpdesk)",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: "/studio?tab=infrastructure",
      tab: "infrastructure",
      label: "Altyapı & Şube Analitiği",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      href: "/studio?tab=billing",
      tab: "billing",
      label: "Muhasebe & Finans (Studio)",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/studio?tab=pricing",
      tab: "pricing",
      label: "Paket & Fiyat Yönetimi",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/studio?tab=logs",
      tab: "logs",
      label: "Sistem Sağlığı & Loglar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 bg-clip-text text-transparent">
              TelefoncuPro
            </h1>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase block mt-1">
            Reseller Studio v2.0
          </span>
        </div>

        {/* Reseller Admin Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm">
            SU
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Reseller Admin</div>
            <div className="text-sm font-bold text-slate-800">SuperAdmin</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.tab;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sistem Telemetrisi */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistem Telemetrisi</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[8px] font-bold text-emerald-600">LIVE</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[9px] font-semibold text-slate-500 mb-0.5">
                <span>Şube Doluluk:</span>
                <span className="font-mono text-slate-700">620 / 1000 Şube</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1">
                <div className="bg-indigo-605 bg-indigo-600 h-1 rounded-full animate-pulse" style={{ width: "62%" }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500 pt-1 border-t border-slate-200/40">
              <div>
                <span className="block text-[8px] text-slate-400">API TRAFİĞİ</span>
                <span className="font-mono font-bold text-slate-700">{telemetry.traffic.toLocaleString()} req/m</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400">TERMİNALLER</span>
                <span className="font-mono font-bold text-slate-700">{telemetry.terminals.toLocaleString()} POS</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
              <div>
                <span className="block text-[8px] text-slate-400">CPU LOAD</span>
                <span className="font-mono font-bold text-slate-700">%{telemetry.cpu}</span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-400">RAM FOOTPRINT</span>
                <span className="font-mono font-bold text-slate-700">{telemetry.ram} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all"
          >
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
            </svg>
            Bayi Arayüzüne Dön
          </Link>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-extrabold text-lg text-slate-800">TelefoncuPro Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-4 animate-slideDown">
          <nav className="space-y-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-teal-600 hover:bg-slate-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
                Bayi Arayüzüne Dön
              </Link>
            </div>

            {/* Mobile Telemetry */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-2">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Altyapı Durumu</span>
                <span className="text-emerald-650 text-emerald-600 flex items-center gap-1 font-bold">🟢 LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-slate-700 text-center">
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">Şube</span>
                  <span className="font-bold">620/1k</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">API Trafiği</span>
                  <span className="font-bold">{telemetry.traffic} req</span>
                </div>
                <div>
                  <span className="block text-[8px] text-slate-400 uppercase">Küme Yükü</span>
                  <span className="font-bold">%{telemetry.cpu} CPU</span>
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Page Content Shell */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-full">
        {children}
      </main>
    </div>
  );
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <StudioLayoutContent>{children}</StudioLayoutContent>
    </Suspense>
  );
}


