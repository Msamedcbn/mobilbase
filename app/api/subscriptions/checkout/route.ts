import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createCheckoutUrl, getVariantId, type LsPlan, type LsBillingCycle } from "@/lib/lemonsqueezy";
import { readLocalStore } from "@/lib/local-store";

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
    // Studio admin başka tenant için URL üretebilir
    const overrideTenantId: string | undefined = body.tenantId;

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

    // Session bilgisinden mevcut tenant'ı bul
    const store = await readLocalStore();
    const sessionRes = await fetch(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/auth/me`,
      { headers: { cookie: req.headers.get("cookie") ?? "" } },
    );
    const sessionJson = sessionRes.ok ? await sessionRes.json() : null;
    const sessionUser = sessionJson?.user;

    const targetTenantId = overrideTenantId ?? sessionUser?.tenantId ?? null;

    // Tenant bilgilerini bul
    let tenantEmail = sessionUser?.email ?? "billing@tenant.local";
    let tenantName = "Tenant";
    if (targetTenantId) {
      const customer = store.customers.find((c) => c.id === targetTenantId);
      if (customer) {
        tenantEmail = customer.email ?? tenantEmail;
        tenantName = customer.fullName ?? tenantName;
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
