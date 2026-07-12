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
      if (!res.ok) throw new Error(json.error ?? "Giris basarisiz");
      toast.success("Oturum acildi");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Oturum acilamadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#030712] px-4" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(20,184,166,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(6,182,212,0.06),transparent_45%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/25">
              <span className="text-lg font-black text-white">M</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">MobiBase</h1>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              Telefon bayiniz icin bulut otomasyon sistemine giris yapin.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 pl-1">E-Posta</label>
              <div className="relative">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 pl-11 text-sm font-semibold text-white placeholder-slate-500 transition focus:border-teal-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adiniz@mobibase.com"
                  required
                />
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615m19.5 0v-3a2.25 2.25 0 00-2.25-2.25h-15a2.25 2.25 0 00-2.25 2.25v3" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 pl-1">Sifre</label>
              <div className="relative">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 pl-11 text-sm font-semibold text-white placeholder-slate-500 transition focus:border-teal-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
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

            <button
              disabled={loading}
              className="w-full rounded-full bg-white py-4 text-sm font-black text-[#030712] shadow-lg shadow-white/10 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Giris yapiliyor..." : "Giris Yap"}
            </button>
          </form>

          <p className="mt-6 text-[10px] text-slate-600 text-center font-semibold">
            (c) 2026 MobiBase Cloud Technologies
          </p>
        </div>
      </div>
    </section>
  );
}
