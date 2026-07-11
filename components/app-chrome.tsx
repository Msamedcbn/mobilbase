"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";
import { SupportBot } from "@/components/support-bot";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isPublicOrStudio = pathname === "/" || pathname === "/login" || pathname?.startsWith("/servis/") || pathname?.startsWith("/studio");

  if (isPublicOrStudio) {
    return (
      <div className="min-h-screen">
        <main className="w-full">{children}</main>
        <Toaster richColors position="top-right" closeButton />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden md:grid md:grid-cols-[260px_1fr]">
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#090d16] border-b border-slate-800/40 z-40 flex items-center justify-between px-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center border border-teal-500/20 shadow-md shadow-teal-900/30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <div>
            <span className="font-black tracking-tight text-sm block">MobiBase</span>
            <span className="text-[8px] font-bold text-slate-500 tracking-wider uppercase block">Cloud Platform</span>
          </div>
        </div>
        
        <button 
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white focus:outline-none rounded-xl hover:bg-slate-800/60 border border-slate-800/50 transition-colors"
          aria-label="Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className={`mobile-backdrop ${mobileOpen ? "open" : ""}`} onClick={() => setMobileOpen(false)} />
      <Sidebar className={`mobile-drawer ${mobileOpen ? "open" : ""}`} onNavigate={() => setMobileOpen(false)} />
      <main className="main-content p-4 md:p-6 mt-14 md:mt-0 overflow-x-hidden w-full">{children}</main>
      <SupportBot />
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
