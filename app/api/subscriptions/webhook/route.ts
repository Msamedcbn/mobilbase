import { NextResponse } from "next/server";
import { verifyWebhookSignature, parseLsWebhook } from "@/lib/lemonsqueezy";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { normalizeLedgerEntry } from "@/lib/studio-finance";

/**
 * POST /api/subscriptions/webhook
 * LemonSqueezy'den gelen webhook olaylarını işler.
 *
 * Desteklenen olaylar:
 *   subscription_created       → tenant lisansını güncelle
 *   subscription_updated       → abonelik durumu değişikliği
 *   subscription_payment_success → billing ledger'a tahsilat ekle
 *   subscription_cancelled     → tenant'ı dondur
 *   subscription_expired       → lisansı bitir
 */
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

  const store = await readLocalStore();

  if (!tenantId) {
    // tenant_id yoksa sadece logla
    console.warn("[ls-webhook] custom_data.tenant_id bulunamadı, işlem atlandı");
    return NextResponse.json({ received: true });
  }

  const customerIdx = store.customers.findIndex((c) => c.id === tenantId);
  if (customerIdx === -1) {
    console.warn(`[ls-webhook] tenant ${tenantId} bulunamadı`);
    return NextResponse.json({ received: true });
  }

  const customer = store.customers[customerIdx];
  let meta: Record<string, any> = {};
  try {
    meta = customer.notes ? JSON.parse(customer.notes) : {};
  } catch {
    meta = {};
  }

  const subscriptionId = String(event.data.id);
  const status = attrs.status ?? "active";
  const variantId = String(attrs.variant_id ?? "");
  const currentPeriodEnd: string = attrs.current_period_end ?? "";
  const renewsAt: string | null = attrs.renews_at ?? null;
  const endsAt: string | null = attrs.ends_at ?? null;
  const productName: string = attrs.product_name ?? "";

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
      if (currentPeriodEnd) {
        meta.licenseEnd = currentPeriodEnd.split("T")[0];
      }
      meta.isFrozen = false;
      meta.leadStatus = "WON";
      console.log(`[ls-webhook] Abonelik oluşturuldu — tenant ${tenantId}, plan: ${plan}`);
      break;
    }

    case "subscription_updated": {
      // Güncelleme — status değişimi
      if (status === "active") meta.isFrozen = false;
      if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
      console.log(`[ls-webhook] Abonelik güncellendi — tenant ${tenantId}, status: ${status}`);
      break;
    }

    case "subscription_payment_success": {
      const amount = Number(attrs.total ?? 0) / 100; // cents → USD
      const billingReason = attrs.billing_reason ?? "subscription";

      const newEntry = normalizeLedgerEntry({
        id: `ls-pay-${Date.now()}`,
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

      meta.billingLedger = [...(meta.billingLedger ?? []), newEntry];
      if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
      meta.isFrozen = false;
      console.log(`[ls-webhook] Ödeme başarılı — tenant ${tenantId}, ${amount} USD`);
      break;
    }

    case "subscription_cancelled": {
      meta.lsSubscriptionStatus = "cancelled";
      meta.lsCancelledAt = new Date().toISOString();
      // Dönem sonuna kadar aktif kalır
      console.log(`[ls-webhook] Abonelik iptal edildi — tenant ${tenantId}`);
      break;
    }

    case "subscription_expired": {
      meta.lsSubscriptionStatus = "expired";
      meta.isFrozen = true;
      if (!meta.licenseEnd) meta.licenseEnd = new Date().toISOString().split("T")[0];
      console.log(`[ls-webhook] Abonelik sona erdi — tenant ${tenantId}`);
      break;
    }

    case "subscription_paused": {
      meta.lsSubscriptionStatus = "paused";
      meta.isFrozen = true;
      console.log(`[ls-webhook] Abonelik duraklatıldı — tenant ${tenantId}`);
      break;
    }

    case "subscription_unpaused": {
      meta.lsSubscriptionStatus = "active";
      meta.isFrozen = false;
      console.log(`[ls-webhook] Abonelik devam ediyor — tenant ${tenantId}`);
      break;
    }

    default:
      console.log(`[ls-webhook] Bilinmeyen olay: ${eventName} — işlem atlandı`);
      return NextResponse.json({ received: true });
  }

  // Audit log ekle
  store.studioAuditLogs = store.studioAuditLogs ?? [];
  store.studioAuditLogs.unshift({
    id: `audit-ls-${Date.now()}`,
    createdAt: new Date().toISOString(),
    actor: "LemonSqueezy",
    action: eventName.toUpperCase(),
    targetType: "TENANT",
    targetId: tenantId,
    detail: `${eventName} — ${productName} (sub: ${subscriptionId})`,
    context: { subscriptionId, status, variantId },
  });

  store.customers[customerIdx] = {
    ...customer,
    notes: JSON.stringify(meta),
  };

  await writeLocalStore(store);
  return NextResponse.json({ received: true });
}
