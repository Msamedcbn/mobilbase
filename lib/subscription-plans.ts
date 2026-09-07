/**
 * Shared subscription constants — hem client hem server tarafında kullanılabilir.
 * Server-only Polar API fonksiyonları için: @/lib/polar
 *
 * Tek plan, tüm özellikler dahil — sadece faturalandırma dönemi (aylık/yıllık) seçilir.
 */

export type BillingCycle = "monthly" | "annual";

export const PLAN_NAME = "VibeGSM";

/** TRY sabit fiyat. Yıllık, %ANNUAL_DISCOUNT_PCT indirimli toplam tutardır — tek seferde tahsil edilir. */
export const PLAN_PRICE_TRY: Record<BillingCycle, number> = {
  monthly: 500,
  annual: 5100,
};

export const ANNUAL_DISCOUNT_PCT = 15;
