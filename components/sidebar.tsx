"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

type NavItem = {
  href: string;
  label: string;
  module?: "repairs" | "pos" | "stock" | "invoicing" | "branches" | "buyback";
  adminOnly?: boolean;
};

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Genel",
    items: [
      { href: "/hizli-yonetim", label: "Hızlı Yönetim" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/yardim", label: "Yardım" },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { href: "/tamir-takip", label: "Tamir Takip", module: "repairs" },
      { href: "/parca-fiyatlari", label: "Parça & Onarım Fiyatları", module: "repairs" },
      { href: "/pos", label: "Hızlı Satış (POS)", module: "pos" },
      { href: "/kurumsal-teklifler", label: "Kurumsal Teklifler", module: "invoicing" },
    ],
  },
  {
    title: "Stok ve Lojistik",
    items: [
      { href: "/stok", label: "Stok Yönetimi", module: "stock" },
      { href: "/ic-servis-dongusu", label: "İç Servis Döngüsü", module: "stock" },
      { href: "/toptan-alim-satis", label: "Toptan Alış / Satış", module: "stock" },
      { href: "/distributor-ithalat", label: "Distribütör İthalat", module: "stock" },
      { href: "/seri-no-takip", label: "Seri No Takip", module: "stock" },
    ],
  },
  {
    title: "İkinci El ve Cihaz Alımı",
    items: [
      { href: "/buyback/backoffice", label: "Cihaz Alimi (Buyback)", module: "buyback" },
      { href: "/ikinci-el", label: "İkinci El İşlemleri", module: "buyback" },
    ],
  },
  {
    title: "Finans",
    items: [
      { href: "/musteriler-veresiye", label: "Müşteriler & Veresiye", module: "invoicing" },
      { href: "/banka", label: "Banka Yönetimi", module: "invoicing" },
      { href: "/taksit-yonetimi", label: "Taksit Yönetimi", module: "invoicing" },
      { href: "/giderler", label: "Gider Yönetimi", module: "invoicing" },
      { href: "/veri-analizi", label: "Veri Analizi", module: "invoicing" },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { href: "/subeler", label: "Şube Yönetimi", module: "branches" },
      { href: "/ayarlar", label: "Ayarlar", module: "branches" },
    ],
  },
];

type SessionUser = {
  fullName: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
};

const getIcon = (href: string) => {
  switch (href) {
    case "/hizli-yonetim":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "/dashboard":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case "/tamir-takip":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM9 10h6m-3-3v6" />
        </svg>
      );
    case "/parca-fiyatlari":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2-2 4 4m0-7a3 3 0 11-6 0 3 3 0 016 0zM12 17V3m0 14h.01" />
        </svg>
      );
    case "/pos":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "/kurumsal-teklifler":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "/stok":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "/ic-servis-dongusu":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
        </svg>
      );
    case "/toptan-alim-satis":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case "/distributor-ithalat":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      );
    case "/seri-no-takip":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01M3 21h18M3 3h18v18H3V3z" />
        </svg>
      );
    case "/musteriler-veresiye":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "/banka":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "/taksit-yonetimi":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "/giderler":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "/veri-analizi":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l7 6-7 6zM4 4v16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V10m5 10V4m-10 16v-6" />
        </svg>
      );
    case "/subeler":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "/buyback/backoffice":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6m0 0l-2-2m2 2l2-2" />
        </svg>
      );
    case "/ikinci-el":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "/ayarlar":
      return (
        <svg className="w-4 h-4 shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export function Sidebar({ onNavigate, className = "" }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        setUser(json.user ?? null);
        setTenantName(json.tenantName ?? "");
        setRolePermissions(json.rolePermissions ?? {});
        setActiveModules(json.activeModules ?? {});
      })
      .catch(() => {
        setUser(null);
        setTenantName("");
      });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Oturum kapatıldı");
    window.location.href = "/login";
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "PLATFORM_OWNER": return "Platform Sahibi";
      case "ADMIN": return "Yönetici";
      case "MANAGER": return "Müdür";
      case "ACCOUNTANT": return "Muhasebeci";
      case "CASHIER": return "Kasiyer";
      case "TECHNICIAN": return "Teknisyen";
      default: return role;
    }
  };

  if (pathname === "/login") return null;

  return (
    <aside className={`sidebar-shell flex flex-col justify-between ${className}`}>
      <div>
        <div className="mb-6 border-b border-slate-800/40 pb-5">
          <div className="flex items-center gap-2.5">
            <img src="/icon-square.png" alt="VibeGSM" className="w-8 h-8 rounded-xl shadow-lg shadow-blue-900/35 border border-blue-500/20 object-cover" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">VibeGSM</h1>
              <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Cloud Platform</span>
            </div>
          </div>
          {tenantName && (
            <div className="mt-4 pt-3.5 border-t border-slate-800/30">
              <div className="text-[8px] font-bold tracking-widest text-blue-400 uppercase mb-0.5 opacity-90">DUKKAN</div>
              <div className="text-sm font-black tracking-tight text-blue-300 uppercase break-words leading-tight">{tenantName}</div>
            </div>
          )}
        </div>

        {user && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-300 flex items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-blue-900/30">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{getRoleLabel(user.role)}</div>
            </div>
          </div>
        )}

        <nav className="space-y-6">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (!user) return false;
              if (user.role === "ADMIN" || user.role === "PLATFORM_OWNER" || user.role === "MANAGER") return true;
              if (item.adminOnly) return false;
              if (item.module) {
                const isModuleActive = activeModules[item.module] !== false;
                const userPerms = rolePermissions[user.role] || [];
                const hasBranchFallback = item.module === "branches" && userPerms.includes("stock");
                const hasPermission = userPerms.includes(item.module) || hasBranchFallback;
                return isModuleActive && hasPermission;
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-2">
                <p className="px-3 text-[9px] font-bold uppercase tracking-widest text-slate-500/80">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        id={`nav-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
                        className={`sidebar-nav-link group ${
                          active ? "active" : ""
                        }`}
                      >
                        {getIcon(item.href)}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <button 
        onClick={logout} 
        className="mt-8 w-full rounded-xl border border-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-700 transition flex items-center justify-center gap-2"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Çıkış Yap
      </button>
    </aside>
  );
}
