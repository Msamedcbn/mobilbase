"use client";

import { useState } from "react";
import { toast } from "sonner";

function normalizeTrPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

function isValidTrMobile(digits: string) {
  return /^5\d{9}$/.test(digits);
}

/** "Buy now" button + modal — no account needed first, goes straight to a Polar checkout. */
export function DirectPurchaseButton({ cycle }: { cycle: "monthly" | "annual" }) {
  const [open, setOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const close = () => { if (!loading) setOpen(false); };

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white py-2.5 text-[13px] font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
      >
        💳 Doğrudan Satın Al
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-5"
          onClick={close}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl">
            <button
              onClick={close}
              aria-label="Kapat"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-lg font-black text-slate-900">Doğrudan Satın Al</h3>
            <p className="mt-1 text-xs text-slate-500">Bilgilerinizi girin, güvenli ödeme sayfasına yönlendirilin. Ödeme tamamlanınca hesabınız otomatik oluşur ve panele giriş yaparsınız.</p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Bayi adı (zorunlu)"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adınız soyadınız"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email adresi (zorunlu)"
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex items-center rounded-xl border border-slate-200 pl-4 focus-within:ring-2 focus-within:ring-blue-400">
                <span className="shrink-0 text-sm font-semibold text-slate-400">+90</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  type="tel"
                  inputMode="numeric"
                  required
                  className="w-full bg-transparent px-2 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 text-[11px] leading-5 text-slate-500">
                <input
                  type="checkbox"
                  checked={kvkkAccepted}
                  onChange={(e) => setKvkkAccepted(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
                />
                <span>
                  <a href="/gizlilik-ve-kvkk" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 underline hover:text-blue-700">
                    Gizlilik Politikası ve KVKK Aydınlatma Metni
                  </a>
                  &apos;ni okudum, kişisel verilerimin ve ödeme bilgilerimin belirtilen kapsamda işlenmesini kabul ediyorum.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-blue-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Yönlendiriliyor…" : "Ödemeye Geç"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
