import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createCheckoutUrl, getVariantId, type LsPlan, type LsBillingCycle } from "@/lib/lemonsqueezy";
import { findTenantById } from "@/lib/tenant-store";

/**
 * POST /api/subscriptions/checkout
 * Body: { plan: "Pro", cycle: "monthly" | "annual", tenantId?: string }
 *
 * Studio admini başka tenant adına veya tenant kendi adına checkout URL alır.
 */
export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const plan = (body.plan ?? "Pro") as LsPlan;
    const cycle = (body.cycle ?? "monthly") as LsBillingCycle;
    // Only the platform side may raise a checkout on another tenant's behalf.
    // Accepting this from any caller let one tenant start a subscription against
    // another tenant's record.
    const isPlatformCaller = auth.user.role === "PLATFORM_OWNER";
    const overrideTenantId: string | undefined = isPlatformCaller ? body.tenantId : undefined;

    const validPlans: LsPlan[] = ["Lite", "Service", "Pro", "Enterprise"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "annual") {
      return NextResponse.json({ error: "Geçersiz faturalandırma dönemi" }, { status: 400 });
    }

    // Variant ID'yi env'den al
    let variantId: string;
    try {
      variantId = getVariantId(plan, cycle);
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message, hint: "LemonSqueezy variant ID'lerini .env dosyasına ekleyin" },
        { status: 503 },
      );
    }

    // requireRole already returned the verified session, so the previous HTTP
    // round-trip to /api/auth/me was a network hop for data we hold in hand.
    const targetTenantId = overrideTenantId ?? auth.user.tenantId ?? null;

    let tenantEmail = auth.user.email ?? "billing@tenant.local";
    let tenantName = "Tenant";
    if (targetTenantId) {
      const tenant = await findTenantById(targetTenantId);
      if (tenant) {
        tenantEmail = tenant.email ?? tenantEmail;
        tenantName = tenant.fullName ?? tenantName;
      }
    }

    const result = await createCheckoutUrl({
      variantId,
      tenantId: targetTenantId ?? "unknown",
      tenantEmail,
      tenantName,
      customData: {
        plan,
        cycle,
        tenant_id: targetTenantId ?? "",
      },
      redirectUrl: `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/ayarlar/abonelik?success=1`,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl, checkoutId: result.checkoutId });
  } catch (err: any) {
    console.error("[checkout/route]", err);
    return NextResponse.json({ error: err.message ?? "Checkout oluşturulamadı" }, { status: 500 });
  }
}
