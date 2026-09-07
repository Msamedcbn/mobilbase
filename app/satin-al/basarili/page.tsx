"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; email: string | null; shopName: string; temporaryPassword: string | null; isNew: boolean };

function IconCheck(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function Content() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout_id");
  const [state, setState] = useState<State>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!checkoutId) {
      setState({ status: "error", message: "Geçersiz bağlantı — checkout bilgisi bulunamadı." });
      return;
    }
    fetch(`/api/subscriptions/complete?checkout_id=${encodeURIComponent(checkoutId)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: json.error ?? "Bir şeyler ters gitti." });
          return;
        }
        setState({
          status: "success",
          email: json.email ?? null,
          shopName: json.shopName ?? "",
          temporaryPassword: json.temporaryPassword ?? null,
          isNew: Boolean(json.isNew),
        });
      })
      .catch(() => setState({ status: "error", message: "Bağlantı hatası. Sayfayı yenileyip tekrar deneyin." }));
  }, [checkoutId]);

  const copyPassword = async (pw: string) => {
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#030712] px-4 py-16" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(59,130,246,0.12),transparent_50%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] text-center">
          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />
              <p className="text-sm text-slate-400">Ödemeniz doğrulanıyor…</p>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <p className="text-lg font-black text-white">Doğrulanamadı</p>
              <p className="text-sm text-slate-400">{state.message}</p>
              <a href="https://wa.me/905454403452" target="_blank" rel="noopener noreferrer nofollow" className="mt-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#25D366]/25 transition hover:brightness-105">
                WhatsApp&apos;tan Destek Alın
              </a>
            </div>
          )}

          {state.status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <IconCheck className="w-8 h-8" />
              </div>
              <p className="text-xl font-black text-white">Ödemeniz alındı! 🎉</p>
              <p className="text-sm text-slate-400">{state.shopName} hesabınız hazır. Panelinize giriş yaptık.</p>

              {state.isNew && state.temporaryPassword && (
                <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Giriş Bilgileriniz — bir daha gösterilmeyecek</p>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <p className="text-slate-300">E-posta: <span className="font-bold text-white">{state.email}</span></p>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-300">Şifre: <span className="font-mono font-bold text-white">{state.temporaryPassword}</span></p>
                      <button
                        onClick={() => copyPassword(state.temporaryPassword!)}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/20 transition"
                      >
                        {copied ? "Kopyalandı ✓" : "Kopyala"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Bu bilgileri bir yere kaydedin. Panelden istediğiniz zaman şifrenizi değiştirebilirsiniz.</p>
                </div>
              )}

              <a href="/dashboard" className="mt-2 w-full rounded-full bg-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700">
                Panele Git
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SatinAlBasariliPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#030712]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />
      </div>
    }>
      <Content />
    </Suspense>
  );
}
