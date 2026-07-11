/**
 * LemonSqueezy API Client
 * Checkout URL oluşturma, webhook doğrulama, subscription sorgulama.
 * USD/TRY kur çekme fonksiyonu da burada tutulur.
 */

import crypto from "node:crypto";
import { PLAN_USD_PRICES, type LsPlan, type LsBillingCycle } from "@/lib/subscription-plans";

export type { LsPlan, LsBillingCycle } from "@/lib/subscription-plans";
export { PLAN_USD_PRICES } from "@/lib/subscription-plans";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";

function getApiKey(): string {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY env eksik");
  return key;
}

function getWebhookSecret(): string {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET env eksik");
  return secret;
}

function getStoreId(): string {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new Error("LEMONSQUEEZY_STORE_ID env eksik");
  return id;
}

// ─── Plan → Variant ID Map ────────────────────────────────────────────────────

export function getVariantId(plan: LsPlan, cycle: LsBillingCycle): string {
  const key = `LS_VARIANT_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  const id = process.env[key];
  if (!id) throw new Error(`${key} env değişkeni eksik — LemonSqueezy dashboard'dan alın`);
  return id;
}

// ─── Döviz Kuru ───────────────────────────────────────────────────────────────

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

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateCheckoutOptions {
  variantId: string;
  tenantId: string;
  tenantEmail: string;
  tenantName?: string;
  /** Webhook'ta geri alınacak custom veriler */
  customData?: Record<string, string>;
  /** Ödeme tamamlanınca yönlendirilecek URL */
  redirectUrl?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  checkoutId: string;
}

/** LemonSqueezy üzerinde checkout oturumu oluşturur, URL döner. */
export async function createCheckoutUrl(opts: CreateCheckoutOptions): Promise<CheckoutResult> {
  const storeId = getStoreId();

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: opts.tenantEmail,
          name: opts.tenantName ?? "",
          custom: {
            tenant_id: opts.tenantId,
            ...(opts.customData || {}),
          },
        },
        product_options: {
          redirect_url: opts.redirectUrl ?? `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/ayarlar/abonelik?success=1`,
        },
        expires_at: null, // link süresiz
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: opts.variantId } },
      },
    },
  };

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LemonSqueezy checkout hatası: ${res.status} — ${err}`);
  }

  const json = await res.json();
  const attrs = json?.data?.attributes;
  const checkoutUrl = attrs?.url;
  const checkoutId = json?.data?.id;

  if (!checkoutUrl) throw new Error("LemonSqueezy checkout URL döndürmedi");

  return { checkoutUrl, checkoutId };
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface LsSubscription {
  id: string;
  status: "active" | "cancelled" | "expired" | "paused" | "unpaid" | "past_due" | "on_trial";
  customerId: string;
  variantId: string;
  productName: string;
  variantName: string;
  currentPeriodEnd: string;
  renewsAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  customerPortalUrl: string;
  updatePaymentMethodUrl: string;
}

/** Subscription ID ile LemonSqueezy'den abonelik bilgisi çeker. */
export async function getSubscription(subscriptionId: string): Promise<LsSubscription | null> {
  try {
    const res = await fetch(`${LS_API_BASE}/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const a = json?.data?.attributes;
    if (!a) return null;

    return {
      id: json.data.id,
      status: a.status,
      customerId: String(a.customer_id),
      variantId: String(a.variant_id),
      productName: a.product_name ?? "",
      variantName: a.variant_name ?? "",
      currentPeriodEnd: a.current_period_end ?? "",
      renewsAt: a.renews_at ?? null,
      endsAt: a.ends_at ?? null,
      cancelledAt: a.cancelled_at ?? null,
      customerPortalUrl: a.urls?.customer_portal ?? "",
      updatePaymentMethodUrl: a.urls?.update_payment_method ?? "",
    };
  } catch {
    return null;
  }
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

/** Mevcut aboneliğe ait customer portal URL'sini döner (LemonSqueezy managed billing portal). */
export async function getCustomerPortalUrl(subscriptionId: string): Promise<string | null> {
  const sub = await getSubscription(subscriptionId);
  return sub?.customerPortalUrl ?? null;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

/** LemonSqueezy webhook imzasını doğrular. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  try {
    const secret = getWebhookSecret();
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody, "utf8");
    const digest = hmac.digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(signatureHeader, "hex"),
    );
  } catch {
    return false;
  }
}

export interface LsWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: Record<string, string>;
  };
  data: {
    id: string;
    type: string;
    attributes: Record<string, any>;
  };
}

/** Webhook payload'unu parse eder. */
export function parseLsWebhook(body: string): LsWebhookEvent | null {
  try {
    return JSON.parse(body) as LsWebhookEvent;
  } catch {
    return null;
  }
}
