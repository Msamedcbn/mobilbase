/**
 * Shared subscription constants — hem client hem server tarafında kullanılabilir.
 * Server-only LemonSqueezy API fonksiyonları için: @/lib/lemonsqueezy
 */

export type LsPlan = "Lite" | "Service" | "Pro" | "Enterprise";
export type LsBillingCycle = "monthly" | "annual";

/** Aylık USD fiyatları (yıllıkta indirim ayrı uygulanır) */
export const PLAN_USD_PRICES: Record<LsPlan, { monthly: number; annual: number }> = {
  Lite:       { monthly: 19,  annual: 15 },
  Service:    { monthly: 29,  annual: 23 },
  Pro:        { monthly: 49,  annual: 39 },
  Enterprise: { monthly: 99,  annual: 79 },
};

export const PLAN_LIST: LsPlan[] = ["Lite", "Service", "Pro", "Enterprise"];
export const ANNUAL_DISCOUNT_PCT = 15;
