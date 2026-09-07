import { NextResponse } from "next/server";
import { parsePolarWebhook, WebhookVerificationError, PLAN_NAME } from "@/lib/polar";
import { findTenantById, updateTenantMetadata } from "@/lib/tenant-store";
import { logStudioAction } from "@/lib/studio-audit";
import { normalizeLedgerEntry } from "@/lib/studio-finance";
import type { TenantMetadata } from "@/lib/tenant-metadata";

const ALL_MODULES_ENABLED = { pos: true, repairs: true, stock: true, buyback: true, invoicing: true };

/**
 * POST /api/subscriptions/webhook
 * Polar.sh'tan gelen webhook olaylarını işler.
 *
 * Desteklenen olaylar:
 *   subscription.created    → tenant lisansını oluştur (ödeme henüz onaylanmamış olabilir)
 *   subscription.active     → ilk ödeme onaylandı, tenant'ı aktifleştir
 *   subscription.updated    → abonelik durumu değişikliği
 *   subscription.canceled   → dönem sonuna kadar aktif kalır
 *   subscription.uncanceled → iptal geri alındı
 *   subscription.revoked    → erişim hemen sona erer, tenant'ı dondur
 *   subscription.past_due   → ödeme gecikti (henüz dondurulmaz)
 *   order.paid              → billing ledger'a tahsilat ekle
 *
 * State is written through lib/tenant-store, which targets the database when one
 * is configured.
 */

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  let event;
  try {
    event = parsePolarWebhook(rawBody, headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.warn("[polar-webhook] Geçersiz imza — istek reddedildi");
      return NextResponse.json({ error: "Geçersiz imza" }, { status: 403 });
    }
    console.error("[polar-webhook] Payload parse hatası", err);
    return NextResponse.json({ error: "Geçersiz payload" }, { status: 400 });
  }

  console.log(`[polar-webhook] ${event.type}`);

  switch (event.type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.canceled":
    case "subscription.uncanceled":
    case "subscription.revoked":
    case "subscription.past_due": {
      const sub = event.data;
      const tenantId = sub.customer?.externalId ?? (sub.metadata?.tenant_id as string | undefined) ?? "";
      if (!tenantId) {
        console.warn(`[polar-webhook] ${event.type}: tenant_id bulunamadı, işlem atlandı`);
        return NextResponse.json({ received: true });
      }

      const tenant = await findTenantById(tenantId);
      if (!tenant) {
        console.warn(`[polar-webhook] tenant ${tenantId} bulunamadı`);
        return NextResponse.json({ received: true });
      }

      const status = sub.status;
      const currentPeriodEnd = sub.currentPeriodEnd?.toISOString() ?? "";
      const productName = sub.product?.name ?? "";

      const applied = await updateTenantMetadata(tenantId, (current) => {
        const meta = { ...current } as TenantMetadata & Record<string, any>;

        meta.polarSubscriptionId = sub.id;
        meta.polarSubscriptionStatus = status;
        meta.polarProductId = sub.productId;
        meta.polarCustomerId = sub.customerId;
        meta.polarCurrentPeriodEnd = currentPeriodEnd;
        meta.polarCancelAtPeriodEnd = sub.cancelAtPeriodEnd;
        meta.polarProductName = productName;

        switch (event.type) {
          case "subscription.created": {
            meta.plan = PLAN_NAME;
            meta.modules = ALL_MODULES_ENABLED;
            if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
            meta.isTrial = false;
            meta.leadStatus = "WON";
            break;
          }

          case "subscription.active": {
            meta.plan = PLAN_NAME;
            meta.modules = ALL_MODULES_ENABLED;
            if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
            meta.isFrozen = false;
            meta.isTrial = false;
            meta.leadStatus = "WON";
            break;
          }

          case "subscription.updated": {
            if (status === "active") meta.isFrozen = false;
            if (currentPeriodEnd) meta.licenseEnd = currentPeriodEnd.split("T")[0];
            break;
          }

          case "subscription.canceled": {
            meta.polarCanceledAt = sub.canceledAt ? sub.canceledAt.toISOString() : new Date().toISOString();
            // Dönem sonuna kadar aktif kalır (cancelAtPeriodEnd)
            break;
          }

          case "subscription.uncanceled": {
            meta.polarCanceledAt = null;
            break;
          }

          case "subscription.revoked": {
            meta.isFrozen = true;
            if (!meta.licenseEnd) meta.licenseEnd = new Date().toISOString().split("T")[0];
            break;
          }

          case "subscription.past_due": {
            // Henüz dondurma — ödeme yeniden denenirken erişim devam eder
            break;
          }
        }

        return meta;
      });

      if (!applied) {
        console.warn(`[polar-webhook] tenant ${tenantId} güncellenemedi`);
        return NextResponse.json({ received: true });
      }

      console.log(`[polar-webhook] ${event.type} işlendi — tenant ${tenantId}, status: ${status}`);

      await logStudioAction({
        actor: "Polar",
        action: event.type.toUpperCase().replace(".", "_"),
        targetType: "TENANT",
        targetId: tenantId,
        detail: `${event.type} — ${productName} (sub: ${sub.id})`,
        context: { subscriptionId: sub.id, status, productId: sub.productId },
      });

      return NextResponse.json({ received: true });
    }

    case "order.paid": {
      const order = event.data;
      const tenantId = order.customer?.externalId ?? (order.metadata?.tenant_id as string | undefined) ?? "";
      if (!tenantId) {
        console.warn("[polar-webhook] order.paid: tenant_id bulunamadı, işlem atlandı");
        return NextResponse.json({ received: true });
      }

      const applied = await updateTenantMetadata(tenantId, (current) => {
        const meta = { ...current } as TenantMetadata & Record<string, any>;
        const amount = Number(order.totalAmount ?? 0) / 100; // kuruş → TL

        // Polar retries webhooks until it gets a 2xx — key on the order id and
        // skip if it's already recorded so a retry doesn't double-book revenue.
        const entryId = `polar-pay-${order.id}`;
        const ledger: any[] = Array.isArray(meta.billingLedger) ? meta.billingLedger : [];

        if (!ledger.some((e) => e?.id === entryId)) {
          const newEntry = normalizeLedgerEntry({
            id: entryId,
            type: "COLLECTION",
            category: "LICENSE",
            amount,
            description: `Polar Ödeme: ${order.description || meta.polarProductName || ""} (${order.billingReason})`,
            date: new Date().toISOString().split("T")[0],
            status: "PAID",
            referenceNo: order.subscriptionId ?? order.id,
            sourceModule: "BILLING",
            createdBy: "Polar",
          });
          meta.billingLedger = [...ledger, newEntry];
        }

        meta.isFrozen = false;
        return meta;
      });

      if (!applied) {
        console.warn(`[polar-webhook] tenant ${tenantId} güncellenemedi (order.paid)`);
      }

      await logStudioAction({
        actor: "Polar",
        action: "ORDER_PAID",
        targetType: "TENANT",
        targetId: tenantId,
        detail: `order.paid — ${order.description} (${order.id})`,
        context: { orderId: order.id, amount: order.totalAmount },
      });

      return NextResponse.json({ received: true });
    }

    default:
      return NextResponse.json({ received: true });
  }
}
