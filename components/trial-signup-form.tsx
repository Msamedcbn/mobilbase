"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trackConversion } from "@/components/google-analytics";

type ReferralPreview =
  | { status: "idle" | "checking" }
  | { status: "valid"; ownerName: string; discountType: "percent" | "fixed"; discountValue: number }
  | { status: "invalid" };

function normalizeTrPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

function isValidTrMobile(digits: string) {
  return /^5\d{9}$/.test(digits);
}

export function TrialSignupForm({ className }: { className?: string }) {
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralPreview, setReferralPreview] = useState<ReferralPreview>({ status: "idle" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const trimmed = referralCode.trim();
    if (!trimmed) {
      setReferralPreview({ status: "idle" });
      return;
    }
    setReferralPreview({ status: "checking" });
    const handle = setTimeout(() => {
      fetch(`/api/referral-codes/validate?code=${encodeURIComponent(trimmed)}`)
        .then((r) => r.json())
        .then((json) => {
          if (json?.valid) {
            setReferralPreview({
              status: "valid",
              ownerName: json.ownerName,
              discountType: json.discountType,
              discountValue: json.discountValue,
            });
          } else {
            setReferralPreview({ status: "invalid" });
          }
        })
        .catch(() => setReferralPreview({ status: "invalid" }));
    }, 400);
    return () => clearTimeout(handle);
  }, [referralCode]);

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
    const normalizedPhone = normalizeTrPhone(phone);
    if (!isValidTrMobile(normalizedPhone)) {
      toast.error("Telefon numarası 5 ile başlayan 10 haneli olmalıdır (örn: 5XX XXX XX XX)");
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
          phone: normalizedPhone,
          referralCode: referralCode.trim() || undefined,
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
      trackConversion("trial_signup", { shop_name: shopName.trim() });

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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-200/20 border border-blue-200/30">
            <svg className="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
      <h2 className="text-xl font-black text-white md:text-2xl">7 Gün Ücretsiz Deneyin</h2>
      <p className="mt-2 text-sm text-slate-300">
        Kredi kartı gerekmez. Bayinize özel sanal alan hemen açılır.
      </p>

      <div className="mt-5 space-y-3">
        <input
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="Bayi adı (zorunlu)"
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-200/20 transition"
        />
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Adınız soyadınız"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-200/20 transition"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email adresi (zorunlu)"
          type="email"
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-200/20 transition"
        />
        <div className="flex items-center rounded-xl border border-white/15 bg-white/5 pl-4 focus-within:border-blue-200/50 focus-within:ring-2 focus-within:ring-blue-200/20 transition">
          <span className="shrink-0 text-sm font-semibold text-slate-400">+90</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5XX XXX XX XX"
            type="tel"
            inputMode="numeric"
            required
            className="w-full bg-transparent px-2 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="Referans kodu (varsa)"
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
              referralPreview.status === "valid"
                ? "border-emerald-400/50 focus:ring-emerald-400/20"
                : referralPreview.status === "invalid"
                ? "border-rose-400/50 focus:ring-rose-400/20"
                : "border-white/15 focus:border-blue-200/50 focus:ring-blue-200/20"
            }`}
          />
          {referralPreview.status === "valid" && (
            <p className="mt-1.5 text-xs font-bold text-emerald-400">
              ✓ {referralPreview.ownerName} referansı uygulanacak
              {referralPreview.discountType === "percent" ? ` (%${referralPreview.discountValue} indirim)` : ` (₺${referralPreview.discountValue} indirim)`}
            </p>
          )}
          {referralPreview.status === "invalid" && (
            <p className="mt-1.5 text-xs font-bold text-rose-400">Bu kod geçerli değil veya süresi doldu — boş bırakabilirsiniz</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-full bg-blue-200 px-8 py-3.5 text-sm font-black text-[#06111f] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Hazırlanıyor..." : "Ücretsiz Denemeyi Başlat"}
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        7 gün tam erişim. Süre sonunda ekibimiz WhatsApp&apos;tan sizinle iletişime geçer.
      </p>
    </form>
  );
}
