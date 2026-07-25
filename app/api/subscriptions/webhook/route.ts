import { NextResponse } from "next/server";
import { verifyWebhookSignature, parseLsWebhook } from "@/lib/lemonsqueezy";
import { findTenantById, updateTenantMetadata } from "@/lib/tenant-store";
import { logStudioAction } from "@/lib/studio-audit";
import { normalizeLedgerEntry } from "@/lib/studio-finance";
import type { TenantMetadata } from "@/lib/tenant-metadata";

/**
 * POST /api/subscriptions/webhook
 * LemonSqueezy'den gelen webhook olaylarını işler.
 *
 * Desteklenen olaylar:
 *   subscription_created         → tenant lisansını güncelle
 *   subscription_updated         → abonelik durumu değişikliği
 *   subscription_payment_success → billing ledger'a tahsilat ekle
 *   subscription_cancelled       → dönem sonuna kadar aktif kalır
 *   subscription_expired/paused  → tenant'ı dondur
 *
 * State is written through lib/tenant-store, which targets the database when one
 * is configured. This route previously wrote only to the process-local JSON
 * store, so on a real deployment paid subscriptions never reached the tenant
 * record the application actually reads.
 */

const HANDLED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_payment_success",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
]);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-signature") ?? "";

  // İmza doğrulama
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    console.warn("[ls-webhook] Geçersiz imza — istek reddedildi");
    return NextResponse.json({ error: "Geçersiz imza" }, { status: 401 });
  }

  const event = parseLsWebhook(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Geçersiz payload" }, { status: 400 });
  }

  const eventName = event.meta.event_name;
  const customData = event.meta.custom_data ?? {};
  const tenantId = customData.tenant_id ?? "";
  const attrs = event.data.attributes;

  console.log(`[ls-webhook] ${eventName} — tenant: ${tenantId || "(bilinmiyor)"}`);

  if (!HANDLED_EVENTS.has(eventName)) {
    console.log(`[ls-webhook] Bilinmeyen olay: ${eventName} — işlem atlandı`);
    return NextResponse.json({ received: true });
  }

  if (!tenantId) {
    // tenant_id yoksa sadece logla
    console.warn("[ls-webhook] custom_data.tenant_id bulunamadı, işlem atlandı");
    return NextResponse.json({ received: true });
  }

  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    console.warn(`[ls-webhook] tenant ${tenantId} bulunamadı`);
    return NextResponse.json({ received: true });
  }

  const subscriptionId = String(event.data.id);
  const status = attrs.status ?? "active";
  const variantId = String(attrs.variant_id ?? "");
  const currentPeriodEnd: string = attrs.current_period_end ?? "";
  const renewsAt: string | null = attrs.renews_at ?? null;
  const productName: string = attrs.product_name ?? "";

  const applied = await updateTenantMetadata(tenantId, (current) => {
    const meta = { ...current } as TenantMetadata & Record<string, any>;

    // LS abonelik alanlarını güncelle
    meta.lsSubscriptionId = subscriptionId;
    meta.lsSubscriptionStatus = status;
    meta.lsVariantId = variantId;
    meta.lsCustomerId = String(attrs.customer_id ?? "");
    meta.lsCurrentPeriodEnd = currentPeriodEnd;
    meta.lsRenewsAt = renewsAt;
    meta.lsProductName = productName;

    switch (eventName) {
      case "subscription_created": {
        // Plan bilgisini custom_data'dan al
        const plan = customData.plan as string | undefined;
        if (plan && ["Lite", "Service", "Pro", "Enterprise"].includes(plan)) {
          meta.plan = plan;
        }
        // Lisans bitiş tarihini current_period_end olarak ayarla
        if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
        meta.isFrozen = false;
        meta.isTrial = false;
        meta.leadStatus = "WON";
        break;
      }

      case "subscription_updated": {
        if (status === "active") meta.isFrozen = false;
        if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
        break;
      }

      case "subscription_payment_success": {
        const amount = Number(attrs.total ?? 0) / 100; // cents → USD
        const billingReason = attrs.billing_reason ?? "subscription";

        // LemonSqueezy retries webhooks until it gets a 2xx, and the previous
        // implementation keyed each ledger row on Date.now() — so every retry
        // booked the same payment again and inflated reported revenue. Key on
        // the invoice id instead and skip if it is already recorded.
        const invoiceId = String(attrs.invoice_id ?? attrs.order_id ?? subscriptionId);
        const entryId = `ls-pay-${invoiceId}`;
        const ledger: any[] = Array.isArray(meta.billingLedger) ? meta.billingLedger : [];

        if (!ledger.some((e) => e?.id === entryId)) {
          const newEntry = normalizeLedgerEntry({
            id: entryId,
            type: "COLLECTION",
            category: "LICENSE",
            amount,
            description: `LemonSqueezy Ödeme: ${productName} (${billingReason})`,
            date: new Date().toISOString().split("T")[0],
            status: "PAID",
            referenceNo: subscriptionId,
            sourceModule: "BILLING",
            createdBy: "LemonSqueezy",
          });
          meta.billingLedger = [...ledger, newEntry];
        }

        if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
        meta.isFrozen = false;
        break;
      }

      case "subscription_cancelled": {
        meta.lsSubscriptionStatus = "cancelled";
        meta.lsCancelledAt = new Date().toISOString();
        // Dönem sonuna kadar aktif kalır
        break;
      }

      case "subscription_expired": {
        meta.lsSubscriptionStatus = "expired";
        meta.isFrozen = true;
        if (!meta.licenseEnd) meta.licenseEnd = new Date().toISOString().split("T")[0];
        break;
      }

      case "subscription_paused": {
        meta.lsSubscriptionStatus = "paused";
        meta.isFrozen = true;
        break;
      }

      case "subscription_unpaused": {
        meta.lsSubscriptionStatus = "active";
        meta.isFrozen = false;
        break;
      }
    }

    return meta;
  });

  if (!applied) {
    console.warn(`[ls-webhook] tenant ${tenantId} guncellenemedi`);
    return NextResponse.json({ received: true });
  }

  console.log(`[ls-webhook] ${eventName} islendi — tenant ${tenantId}, status: ${status}`);

  await logStudioAction({
    actor: "LemonSqueezy",
    action: eventName.toUpperCase(),
    targetType: "TENANT",
    targetId: tenantId,
    detail: `${eventName} — ${productName} (sub: ${subscriptionId})`,
    context: { subscriptionId, status, variantId },
  });

  return NextResponse.json({ received: true });
}
