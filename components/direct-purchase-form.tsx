"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

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

function isStrongPassword(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

/** Dedicated "buy now" page form — no account needed first, goes straight to a Polar checkout. */
export function DirectPurchaseForm({ cycle, className }: { cycle: "monthly" | "annual"; className?: string }) {
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralPreview, setReferralPreview] = useState<ReferralPreview>({ status: "idle" });
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

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
    if (!isStrongPassword(password)) {
      toast.error("Şifre en az 8 karakter olmalı; büyük/küçük harf ve özel karakter içermelidir");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Şifreler birbiriyle uyuşmuyor");
      return;
    }
    if (!kvkkAccepted) {
      toast.error("Devam etmek için Gizlilik Politikası ve KVKK Aydınlatma Metni'ni onaylamanız gerekir");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/direct-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          fullName: fullName.trim() || shopName.trim(),
          email: trimmedEmail,
          phone: normalizedPhone,
          password,
          referralCode: referralCode.trim() || undefined,
          cycle,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Checkout oluşturulamadı");
        setLoading(false);
        return;
      }
      window.location.href = json.checkoutUrl;
    } catch {
      toast.error("Bağlantı hatası");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-3">
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
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre belirleyin"
            type={showPassword ? "text" : "password"}
            minLength={8}
            required
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-11 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-200/20 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            {showPassword ? "Gizle" : "Göster"}
          </button>
        </div>
        <p className="!mt-1.5 text-[11px] text-slate-500">En az 8 karakter, büyük/küçük harf ve özel karakter (!?%&amp; vb.) içermelidir.</p>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Şifreyi tekrar girin"
          type={showPassword ? "text" : "password"}
          required
          className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
            confirmPassword && confirmPassword !== password
              ? "border-rose-400/50 focus:ring-rose-400/20"
              : "border-white/15 focus:border-blue-200/50 focus:ring-blue-200/20"
          }`}
        />
        {confirmPassword && confirmPassword !== password && (
          <p className="!mt-1.5 text-[11px] font-bold text-rose-400">Şifreler uyuşmuyor</p>
        )}
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

      <label className="mt-4 flex items-start gap-2.5 text-[12px] leading-5 text-slate-400">
        <input
          type="checkbox"
          checked={kvkkAccepted}
          onChange={(e) => setKvkkAccepted(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-blue-400"
        />
        <span>
          <a href="/gizlilik-ve-kvkk" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-200 underline hover:text-white">
            Gizlilik Politikası ve KVKK Aydınlatma Metni
          </a>
          &apos;ni okudum, kişisel verilerimin ve ödeme bilgilerimin belirtilen kapsamda işlenmesini kabul ediyorum.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-full bg-blue-200 px-8 py-3.5 text-sm font-black text-[#06111f] transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Yönlendiriliyor…" : "Güvenli Ödemeye Geç"}
      </button>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        Ödeme tamamlanınca hesabınız otomatik oluşur ve panelinize giriş yaparsınız.
      </p>
    </form>
  );
}
