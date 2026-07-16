"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function StudioLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const canAccessStudio = (role?: string) => role === "PLATFORM_OWNER" || role === "STUDIO_OPERATOR";

  // Check if already logged in as SuperAdmin on page load
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.user && canAccessStudio(json.user.role)) {
          toast.success("Mevcut oturum algılandı, yönlendiriliyorsunuz...");
          router.push("/studio");
        } else {
          setVerifying(false);
        }
      })
      .catch(() => {
        setVerifying(false);
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Giriş başarısız");

      // Verify that the logged-in user has studio-level permission
      if (json.user && !canAccessStudio(json.user.role)) {
        // Logout immediately if user is not authorized
        await fetch("/api/auth/logout", { method: "POST" });
        throw new Error("Bu panele erişim yetkiniz bulunmamaktadır.");
      }

      toast.success("Sistem Stüdyosu oturumu açıldı");
      router.push("/studio");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oturum açılamadı");
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-400 text-sm font-medium">Güvenli bağlantı kontrol ediliyor...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-slate-950 px-4 py-12">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />

      {/* Grid Mesh Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Glassmorphic Login Container */}
      <div className="relative w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in-50 zoom-in-95 duration-500 flex flex-col gap-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Glowing Minimal Admin Logo */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-2 border border-indigo-400/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/60 border border-indigo-800/30 px-3 py-1 rounded-full">
            SaaS Reseller Studio
          </p>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-200 via-violet-200 to-slate-200 bg-clip-text text-transparent tracking-tight mt-1">
            Sistem Yönetimi
          </h1>
          <p className="text-xs text-slate-400 max-w-[280px]">
            VibeGSM SaaS Platformu üst yönetici konsolu güvenli giriş ekranı.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          
          {/* Email input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              SüperAdmin E-Posta
            </label>
            <div className="relative">
              <input
                className="bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-2xl py-3.5 pl-11 pr-4 w-full transition-all duration-300 placeholder-slate-600 text-sm focus:outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="platform.owner@firma.com"
                required
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Password input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Giriş Şifresi
            </label>
            <div className="relative">
              <input
                className="bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 text-white rounded-2xl py-3.5 pl-11 pr-4 w-full transition-all duration-300 placeholder-slate-600 text-sm focus:outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Doğrulanıyor...</span>
              </>
            ) : (
              <span>Sistem Yönetimine Bağlan</span>
            )}
          </button>
        </form>

        {/* Footer Brand Info */}
        <p className="text-[10px] text-slate-600 text-center font-semibold mt-2">
          Bu alan yetkili reseller yöneticileri dışındakilere yasaktır. Yapılan tüm başarısız giriş denemeleri loglanmaktadır.
        </p>
      </div>
    </section>
  );
}


