"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const NAV_LINKS = [
  { label: "Özellikler", href: "/#features" },
  { label: "Paketler", href: "/#pricing" },
  { label: "Neden VibeGSM?", href: "/neden-vibegsm" },
  { label: "Excel ile Karşılaştır", href: "/karsilastir/excel" },
  { label: "Blog", href: "/blog" },
  { label: "Yardım", href: "/yardim" },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" title="VibeGSM Ana Sayfa">
          <Image src="/icon-square.png" alt="VibeGSM" width={32} height={32} className="h-8 w-8 rounded-xl object-cover shadow-md shadow-blue-500/20" />
          <span className="text-base font-black tracking-tight text-slate-900">VibeGSM</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} title={link.label} className="text-[13px] font-semibold text-slate-600 transition hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" title="VibeGSM'e Giriş Yap" className="hidden sm:inline-block rounded-full bg-slate-100 px-4 py-2 text-[13px] font-bold text-slate-800 transition hover:bg-slate-200 border border-slate-200">
            Giriş
          </Link>
          <Link href="/kayit" title="Ücretsiz Demo Kaydı Oluştur" className="inline-block rounded-full bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700">
            Ücretsiz Dene
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menü"
            aria-expanded={menuOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 md:hidden"
          >
            <svg className="h-4 w-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-5 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              title={link.label}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            Giriş
          </Link>
        </nav>
      )}
    </header>
  );
}
