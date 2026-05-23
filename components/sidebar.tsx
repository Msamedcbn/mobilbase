"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tamir-takip", label: "Tamir Takip", module: "repairs" },
  { href: "/parca-fiyatlari", label: "Parça & Onarım Fiyatları", module: "repairs" },
  { href: "/pos", label: "Hızlı Satış (POS)", module: "pos" },
  { href: "/stok", label: "Stok Yönetimi", module: "stock" },
  { href: "/musteriler-veresiye", label: "Müşteriler & Veresiye", module: "invoicing" },
  { href: "/banka", label: "Banka Yönetimi", module: "invoicing" },
  { href: "/taksit-yonetimi", label: "Taksit Yönetimi", module: "invoicing" },
  { href: "/seri-no-takip", label: "Seri No Takip", module: "stock" },
  { href: "/giderler", label: "Gider Yönetimi", module: "invoicing" },
  { href: "/subeler", label: "Şube Yönetimi", adminOnly: true },
  { href: "/distributor-ithalat", label: "Distribütör İthalat", module: "stock" },
  { href: "/ayarlar", label: "Ayarlar", adminOnly: true },
];

type SessionUser = { 
  fullName: string; 
  role: "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
};

export function Sidebar({ onNavigate, className = "" }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [activeModules, setActiveModules] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
    toast.success("Oturum kapatildi");
    router.push("/login");
    router.refresh();
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
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
    <aside className={`sidebar-shell bg-slate-950 p-5 text-slate-100 ${className}`}>
      <div className="mb-4 border-b border-slate-800/60 pb-4">
        <div className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase mb-1">PROGRAM</div>
        <h1 className="text-xl font-black tracking-tight text-white leading-none">MobiBase</h1>
        {tenantName && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/50">
            <div className="text-[9px] font-extrabold tracking-widest text-teal-400 uppercase mb-0.5">DÜKKAN</div>
            <div className="text-lg font-black tracking-tight text-teal-300 uppercase break-words leading-tight">
              {tenantName}
            </div>
          </div>
        )}
      </div>
      
      {user && (
        <div className="mb-5 bg-slate-900/55 border border-slate-800/50 rounded-xl p-2.5 text-xs text-slate-300">
          <div className="font-bold text-white">{user.fullName}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {getRoleLabel(user.role)}
          </div>
        </div>
      )}
      <nav className="mt-6 space-y-2">
        {items
          .filter((item) => {
            if (!user) return false;
            if (user.role === "ADMIN") return true;
            if (item.adminOnly) return false;
            if (item.module) {
              const isModuleActive = activeModules[item.module] !== false;
              const hasPermission = (rolePermissions[user.role] || []).includes(item.module);
              return isModuleActive && hasPermission;
            }
            return true;
          })
          .map((item) => {
            const active = isActive(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={onNavigate} 
                className={`sidebar-nav-link block rounded-xl px-3 py-2 text-sm transition ${active ? "active bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <button onClick={logout} className="mt-6 w-full rounded-xl border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800">
        Cikis Yap
      </button>
    </aside>
  );
}

