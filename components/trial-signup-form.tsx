"use client";

import { useState } from "react";
import { toast } from "sonner";

export function TrialSignupForm({ className }: { className?: string }) {
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || done) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Geçerli bir email adresi giriniz");
      return;
    }
    if (!shopName.trim()) {
      toast.error("Bayi adı zorunludur");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          fullName: fullName.trim() || shopName.trim(),
          email: trimmedEmail,
          phone: phone.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Deneme başlatılamadı");
        setLoading(false);
        return;
      }

      setDone(true);
      toast.success("Deneme sürümünüz hazır! Yönlendiriliyorsunuz...");

      setTimeout(() => {
        window.location.href = json.redirect || "/dashboard";
      }, 1200);
    } catch {
      toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-200/20 border border-cyan-200/30">
            <svg className="w-8 h-8 text-cyan-200" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-lg font-black text-white">Deneme sürümünüz hazırlanıyor</p>
          <p className="text-sm text-slate-400">Birkaç saniye içinde panele yönlendirileceksiniz...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <h2 className="text-xl font-black text-white md:text-2xl">14 Gün Ücretsiz Deneyin</h2>
      <p className="mt-2 text-sm text-slate-300">
        Kredi kartı gerekmez. Bayinize özel sanal alan hemen açılır.
      </p>

      <div className="mt-5 space-y-3">
        <input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="Bayi adı (zorunlu)"
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/20 transition"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Adınız soyadınız"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/20 transition"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email adresi (zorunlu)"
          type="email"
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/20 transition"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefon (opsiyonel)"
          type="tel"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-200/20 transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-full bg-cyan-200 px-8 py-3.5 text-sm font-black text-[#06111f] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Hazırlanıyor..." : "Ücretsiz Denemeyi Başlat"}
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        14 gün tam erişim. Süre sonunda verileriniz 30 gün saklanır.
      </p>
    </form>
  );
}
