import type { Metadata } from "next";
import { TrialSignupForm } from "@/components/trial-signup-form";

const TITLE = "Ücretsiz Kayıt Ol — 7 Gün Demo";
const DESCRIPTION =
  "VibeGSM'i 7 gün ücretsiz deneyin. Kredi kartı gerekmez, hesabınız hemen açılır. Telefon bayileri ve teknik servisler için stok, POS ve servis takibi tek panelde.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/kayit" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
  },
};

export default function KayitPage() {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#030712] px-4 py-16" style={{ fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_30%,rgba(59,130,246,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_80%,rgba(59,130,246,0.06),transparent_45%)]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex flex-col items-center text-center gap-3">
            <img src="/icon-square.png" alt="VibeGSM" className="h-12 w-12 rounded-2xl shadow-lg shadow-blue-500/25 object-cover" />
          </div>

          <TrialSignupForm className="mt-6" />

          <p className="mt-6 text-center text-xs text-slate-500">
            Zaten hesabınız var mı? <a href="/login" className="font-bold text-blue-400 hover:text-blue-300">Giriş yapın</a>
          </p>
        </div>
      </div>
    </section>
  );
}
