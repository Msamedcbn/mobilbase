"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile-only bottom navigation, with a raised circular POS button in the
 * middle. Hidden from md up, where the sidebar takes over.
 */

const TABS = [
  {
    href: "/dashboard",
    label: "Anasayfa",
    path: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    href: "/stok",
    label: "Stok",
    path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    href: "/tamir-takip",
    label: "Servis",
    path: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.276a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085",
  },
  {
    href: "/ayarlar",
    label: "Profil",
    path: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
  },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-stretch border-t border-white/[0.06] bg-[#0f1319] px-2 md:hidden">
      {TABS.slice(0, 2).map((tab) => (
        <TabLink key={tab.href} tab={tab} active={pathname === tab.href} />
      ))}

      {/* Raised POS action — the register is the app's primary action, so it
          gets the centre slot instead of a regular tab. */}
      <div className="relative w-1/5 shrink-0">
        {/* Navigates in place, not a new tab: on a phone a new tab is a dead end
            (no sidebar or tab bar in the POS shell to get back from). */}
        <Link
          href="/pos"
          className="absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-4 ring-[#0f1319] transition active:scale-95"
          aria-label="Hizli Satis (POS)"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </Link>
        <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-bold text-slate-500">POS</span>
      </div>

      {TABS.slice(2).map((tab) => (
        <TabLink key={tab.href} tab={tab} active={pathname === tab.href} />
      ))}
    </nav>
  );
}

function TabLink({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={`flex w-1/5 flex-col items-center justify-center gap-1 transition ${
        active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={tab.path} />
      </svg>
      <span className="text-[9px] font-bold">{tab.label}</span>
    </Link>
  );
}
