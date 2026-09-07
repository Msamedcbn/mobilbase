/**
 * USD/TRY kur çekme — studio içi referans fiyat gösterimlerinde kullanılır
 * (fatura/checkout tutarları artık Polar'da sabit TL fiyat; bu sadece bilgi amaçlıdır).
 */

export interface ExchangeRateResult {
  usdToTry: number;
  source: "live" | "fallback";
  updatedAt: string;
}

/** Anlık USD/TRY kur çeker. Başarısız olursa fallback kur döner. */
export async function fetchUsdToTry(): Promise<ExchangeRateResult> {
  try {
    // frankfurter.app — ücretsiz, gizlilik gerektirmez
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TRY", {
      next: { revalidate: 900 }, // 15 dakika cache
    });
    if (!res.ok) throw new Error("Kur API başarısız");
    const data = await res.json();
    const rate = data?.rates?.TRY;
    if (!rate || typeof rate !== "number") throw new Error("Geçersiz kur yanıtı");
    return { usdToTry: rate, source: "live", updatedAt: new Date().toISOString() };
  } catch {
    // Fallback: sabit yaklaşık kur
    return { usdToTry: 38.5, source: "fallback", updatedAt: new Date().toISOString() };
  }
}
