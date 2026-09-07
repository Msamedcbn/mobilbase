/**
 * Polar.sh API Client
 * Checkout URL oluşturma, webhook doğrulama, subscription ve customer portal sorgulama.
 */

import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { BillingCycle } from "@/lib/subscription-plans";

export type { BillingCycle } from "@/lib/subscription-plans";
export { PLAN_NAME, PLAN_PRICE_TRY, ANNUAL_DISCOUNT_PCT } from "@/lib/subscription-plans";
export { WebhookVerificationError };

let client: Polar | null = null;

/**
 * "sandbox" talks to sandbox-api.polar.sh (Stripe test cards, no real money) —
 * a completely separate Polar account/org/token from production. Only set
 * POLAR_ENVIRONMENT=sandbox for local testing; production must never see it.
 */
function getPolarClient(): Polar {
  if (client) return client;
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error("POLAR_ACCESS_TOKEN env eksik");
  const server = process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  client = new Polar({ accessToken, server });
  return client;
}

function getWebhookSecret(): string {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) throw new Error("POLAR_WEBHOOK_SECRET env eksik");
  return secret;
}

// ─── Billing Cycle → Product ID Map ───────────────────────────────────────────

export function getProductId(cycle: BillingCycle): string {
  const key = `POLAR_PRODUCT_${cycle.toUpperCase()}`;
  const id = process.env[key];
  if (!id) throw new Error(`${key} env değişkeni eksik — Polar panelinden ürün ID'sini alın`);
  return id;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateCheckoutOptions {
  productId: string;
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

/** Polar üzerinde checkout oturumu oluşturur, URL döner. */
export async function createCheckoutUrl(opts: CreateCheckoutOptions): Promise<CheckoutResult> {
  const polar = getPolarClient();

  const checkout = await polar.checkouts.create({
    products: [opts.productId],
    externalCustomerId: opts.tenantId,
    customerEmail: opts.tenantEmail,
    customerName: opts.tenantName,
    metadata: {
      tenant_id: opts.tenantId,
      ...(opts.customData || {}),
    },
    successUrl: opts.redirectUrl ?? `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/ayarlar/abonelik?success=1`,
  });

  return { checkoutUrl: checkout.url, checkoutId: checkout.id };
}

export interface PolarCheckoutInfo {
  id: string;
  status: string;
  externalCustomerId: string | null;
  customerEmail: string | null;
  subscriptionId: string | null;
  metadata: Record<string, unknown>;
}

/** Checkout ID ile Polar'dan checkout oturumu bilgisi çeker (satın alma sonrası doğrulama için). */
export async function getCheckout(checkoutId: string): Promise<PolarCheckoutInfo | null> {
  try {
    const polar = getPolarClient();
    const c = await polar.checkouts.get({ id: checkoutId });
    return {
      id: c.id,
      status: c.status,
      externalCustomerId: c.externalCustomerId,
      customerEmail: c.customerEmail,
      subscriptionId: c.subscriptionId,
      metadata: c.metadata ?? {},
    };
  } catch {
    return null;
  }
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface PolarSubscriptionInfo {
  id: string;
  status: string;
  customerId: string;
  productId: string;
  productName: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

/** Subscription ID ile Polar'dan abonelik bilgisi çeker. */
export async function getSubscription(subscriptionId: string): Promise<PolarSubscriptionInfo | null> {
  try {
    const polar = getPolarClient();
    const sub = await polar.subscriptions.get({ id: subscriptionId });
    return {
      id: sub.id,
      status: sub.status,
      customerId: sub.customerId,
      productId: sub.productId,
      productName: sub.product?.name ?? "",
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.canceledAt ? sub.canceledAt.toISOString() : null,
    };
  } catch {
    return null;
  }
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

/** Tenant'ın Polar customer portal URL'sini döner (external_customer_id üzerinden). */
export async function getCustomerPortalUrl(tenantId: string): Promise<string | null> {
  try {
    const polar = getPolarClient();
    const session = await polar.customerSessions.create({ externalCustomerId: tenantId });
    return session.customerPortalUrl;
  } catch {
    return null;
  }
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

/**
 * Polar webhook payload'unu doğrular ve parse eder.
 * İmza geçersizse WebhookVerificationError fırlatır.
 */
export function parsePolarWebhook(rawBody: string, headers: Record<string, string>) {
  return validateEvent(rawBody, headers, getWebhookSecret());
}
