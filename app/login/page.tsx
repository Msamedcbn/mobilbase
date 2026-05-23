"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      toast.success("Oturum açıldı");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oturum açılamadı");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-[#FAF9F5] px-4 py-12 text-stone-800 selection:bg-amber-200 selection:text-stone-900 font-sans antialiased">
      {/* Decorative Background Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-[#F2EFE9] to-transparent opacity-60 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-[#EFECE6]/40 to-transparent opacity-40 blur-[120px] pointer-events-none" />

      {/* Grid Mesh Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Premium Cream/White Card Container */}
      <div className="relative w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 md:p-10 shadow-xl shadow-stone-900/[0.03] animate-in fade-in-50 zoom-in-95 duration-500 flex flex-col gap-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Minimal Tech Logo */}
          <div className="w-11 h-11 rounded-xl bg-stone-900 flex items-center justify-center shadow-md shadow-stone-900/10 mb-2">
            <svg className="w-5 h-5 text-[#FAF9F5]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest bg-stone-100 border border-stone-200/80 px-2.5 py-1 rounded-full">
            MobiBase SaaS
          </p>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mt-1">
            Yönetici Girişi
          </h1>
          <p className="text-xs text-stone-500 max-w-[280px]">
            Telefon bayiniz için geliştirilmiş bulut otomasyon sistemine güvenli giriş yapın.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          
          {/* Email input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">
              E-Posta Adresi
            </label>
            <div className="relative">
              <input
                className="bg-[#FAF9F5] border border-stone-200 focus:border-stone-400 focus:ring-0 text-stone-900 rounded-2xl py-3.5 pl-11 pr-4 w-full transition-all duration-300 placeholder-stone-400 text-sm focus:outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adiniz@mobibase.com"
                required
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615m19.5 0v-3a2.25 2.25 0 00-2.25-2.25h-15a2.25 2.25 0 00-2.25 2.25v3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Password input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">
              Giriş Şifresi
            </label>
            <div className="relative">
              <input
                className="bg-[#FAF9F5] border border-stone-200 focus:border-stone-400 focus:ring-0 text-stone-900 rounded-2xl py-3.5 pl-11 pr-4 w-full transition-all duration-300 placeholder-stone-400 text-sm focus:outline-none"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Options: Remember me & Forgot Pass */}
          <div className="flex justify-between items-center text-xs px-1 py-1">
            <label className="flex items-center gap-2 text-stone-500 cursor-pointer select-none">
              <input type="checkbox" className="rounded bg-white border-stone-250 text-stone-900 focus:ring-stone-500/20 w-4 h-4 cursor-pointer" />
              <span>Beni Hatırla</span>
            </label>
            <span className="text-stone-700 hover:text-stone-900 cursor-pointer transition font-semibold">Şifremi Unuttum</span>
          </div>

          {/* Action Button */}
          <button
            disabled={loading}
            className="w-full py-4 mt-2 bg-stone-900 hover:bg-stone-850 disabled:opacity-50 text-[#FAF9F5] font-semibold rounded-2xl shadow-lg shadow-stone-950/10 hover:shadow-stone-950/15 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <span>Giriş Yap</span>
            )}
          </button>
        </form>


        {/* Footer Brand Info */}
        <p className="text-[10px] text-stone-500 text-center font-semibold mt-2">
          © 2026 MobiBase Cloud SaaS. Tüm Hakları Saklıdır.
        </p>
      </div>
    </section>
  );
}
