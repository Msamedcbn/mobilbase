"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";
import { SupportBot } from "@/components/support-bot";
import { ProductTour } from "@/components/product-tour";
import { MobileTabBar } from "@/components/mobile-tab-bar";

// Dashboard-wide typography — same pairing as the POS terminal, so every
// screen the dealer actually works in (not the public marketing site) shares
// one consistent, distinctive type system instead of the generic fallback.
const appSans = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-app-sans" });
const appMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-app-mono" });

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isPublicOrStudio =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/kayit" ||
    pathname === "/story-preview" ||
    pathname === "/neden-vibegsm" ||
    pathname === "/yardim" ||
    pathname === "/gizlilik-ve-kvkk" ||
    pathname === "/takas-hesapla" ||
    pathname?.startsWith("/sehirler") ||
    pathname?.startsWith("/servis/") ||
    pathname?.startsWith("/studio") ||
    pathname?.startsWith("/blog") ||
    pathname?.startsWith("/karsilastir") ||
    pathname?.startsWith("/en-iyi-telefoncu-yazilimlari");

  // POS opens in its own tab as a standalone cash-register terminal — it
  // ships its own topbar and full-height layout, so it must skip the
  // dashboard sidebar/shell entirely rather than being squeezed beside it.
  const isPos = pathname === "/pos";

  if (isPublicOrStudio || isPos) {
    return (
      <div className="min-h-screen" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
        <main className="w-full">{children}</main>
        <Toaster richColors position="top-right" closeButton />
      </div>
    );
  }

  return (
    <div
      className={`app-shell min-h-screen overflow-x-hidden md:grid md:grid-cols-[280px_1fr] ${appSans.variable} ${appMono.variable}`}
      style={{ fontFamily: "var(--font-app-sans), 'Plus Jakarta Sans', sans-serif" }}
    >
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#090d16] border-b border-white/[0.06] z-40 flex items-center justify-between px-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2.5">
          <img src="/icon-square.png" alt="VibeGSM" className="w-8 h-8 rounded-xl shadow-lg shadow-blue-900/30 object-cover" />
          <div>
            <span className="font-black tracking-tight text-sm block">VibeGSM</span>
            <span className="text-[8px] font-bold text-slate-500 tracking-wider uppercase block">Bayi Platformu</span>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 border border-white/[0.06] transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className={`mobile-backdrop ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />
      <Sidebar className={`mobile-drawer ${mobileOpen ? "open" : ""}`} onNavigate={() => setMobileOpen(false)} />
      <main className="main-content p-4 md:p-8 mt-14 md:mt-0 pb-24 md:pb-8 overflow-x-hidden w-full bg-[#f4f6f9]">{children}</main>
      <MobileTabBar />
      <ProductTour />
      <SupportBot />
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
