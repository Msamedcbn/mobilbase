"use client";

import { useState, useMemo } from "react";

interface ModelInfo {
  brand: string;
  model: string;
  basePrice: number;
}

const CONDITIONS = [
  { key: "excellent", label: "Çok İyi (A+)", description: "Kutusunda, sıfır ayarında, çiziksiz", multiplier: 0.2 },
  { key: "good", label: "İyi (A)", description: "Hafif kullanım izleri, tam fonksiyonel", multiplier: 0 },
  { key: "fair", label: "Orta (B)", description: "Belirgin kullanım izleri, çalışır durumda", multiplier: -0.2 },
  { key: "poor", label: "Kötü (C)", description: "Ekran çizik, kasa hasarlı, onarım gerekir", multiplier: -0.3 },
];

export function BuybackCalculator({ brands, models }: { brands: string[]; models: ModelInfo[] }) {
  const [step, setStep] = useState<"brand" | "model" | "condition" | "result">("brand");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [condition, setCondition] = useState("good");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const brandModels = useMemo(
    () => (selectedBrand ? models.filter((m) => m.brand === selectedBrand) : []),
    [selectedBrand, models]
  );

  const foundModel = models.find((m) => m.brand === selectedBrand && m.model === selectedModel);
  const conditionMultiplier = CONDITIONS.find((c) => c.key === condition)?.multiplier ?? 0;
  const estimatedPrice = foundModel ? Math.round(foundModel.basePrice * (1 + conditionMultiplier)) : 0;

  function reset() {
    setStep("brand");
    setSelectedBrand("");
    setSelectedModel("");
    setCondition("good");
    setEmail("");
    setPhone("");
    setSubmitted(false);
  }

  async function handleLeadCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;

    try {
      await fetch("/api/trial/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim() || undefined,
          source: "buyback-calculator",
          deviceModel: `${selectedBrand} ${selectedModel}`,
          estimatedPrice,
        }),
      });
    } catch {}

    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 md:py-24">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">İkinci El Cihaz Alımı</p>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.035em] text-white md:text-5xl">Takas Fiyatı Hesapla</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Cihaz modelini ve durumunu seçin, yaklaşık alım fiyatını görün. Kesin fiyat bayi değerlendirmesi sonrası belirlenir.
        </p>
      </div>

      <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        {step === "brand" && (
          <div>
            <p className="text-sm font-bold text-slate-400">Marka seçin</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => { setSelectedBrand(brand); setStep("model"); }}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-blue-200/40 hover:bg-white/10"
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "model" && (
          <div>
            <button onClick={() => setStep("brand")} className="mb-4 text-xs font-bold text-slate-400 hover:text-white transition">
              ← Marka değiştir
            </button>
            <p className="text-sm font-bold text-slate-400">{selectedBrand} model seçin</p>
            <div className="mt-4 grid gap-2 max-h-80 overflow-y-auto">
              {brandModels.map((m) => (
                <button
                  key={m.model}
                  onClick={() => { setSelectedModel(m.model); setStep("condition"); }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-blue-200/40 hover:bg-white/10"
                >
                  {m.model}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "condition" && (
          <div>
            <button onClick={() => setStep("model")} className="mb-4 text-xs font-bold text-slate-400 hover:text-white transition">
              ← Model değiştir
            </button>
            <p className="text-sm font-bold text-slate-400">{selectedBrand} {selectedModel} — durum seçin</p>
            <div className="mt-4 space-y-3">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setCondition(c.key); setStep("result"); }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    condition === c.key
                      ? "border-blue-200/50 bg-blue-200/10"
                      : "border-white/10 bg-white/[0.04] hover:border-blue-200/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{c.label}</p>
                      <p className="mt-1 text-xs text-slate-400">{c.description}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {c.multiplier > 0 ? `+${Math.round(c.multiplier * 100)}%` : c.multiplier < 0 ? `${Math.round(c.multiplier * 100)}%` : "±0%"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-200/10 border border-blue-200/20">
              <span className="text-2xl font-black text-blue-200">₺</span>
            </div>

            <h2 className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
              {estimatedPrice.toLocaleString("tr-TR")} TL
            </h2>
            <p className="mt-2 text-sm text-slate-400">Tahmini alım fiyatı — {selectedBrand} {selectedModel}</p>

            <div className="mt-4 rounded-xl bg-amber-400/10 border border-amber-400/20 px-4 py-2.5">
              <p className="text-xs font-semibold text-amber-200/80">
                Bu fiyat tahminidir. Kesin fiyat bayi değerlendirmesi sonrası belirlenir.
              </p>
            </div>

            {!submitted ? (
              <form onSubmit={handleLeadCapture} className="mt-6 space-y-3">
                <p className="text-sm font-bold text-white">Teklif almak için bilgilerinizi bırakın</p>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email adresi"
                  type="email"
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Telefon (opsiyonel)"
                  type="tel"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:border-blue-200/50 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-blue-200 px-6 py-3 text-sm font-black text-[#06111f] transition hover:bg-white"
                >
                  Teklif Al
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 p-5 text-center">
                <p className="text-sm font-black text-emerald-200">Talebiniz alındı!</p>
                <p className="mt-1 text-xs text-slate-400">En kısa sürede size dönüş yapacağız.</p>
              </div>
            )}

            <button
              onClick={reset}
              className="mt-6 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Yeni hesaplama yap
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        VibeGSM — Telefon bayileri için tek operasyon sistemi
      </p>
    </div>
  );
}
