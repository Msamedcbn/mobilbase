import { NextResponse } from "next/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/subscriptions/portal
 * Oturum acmis tenant'in LemonSqueezy customer portal URL'sini doner.
 */
export async function GET(req: Request) {
  try {
    const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"]);
    if (auth.error) return auth.error;
    // Session'dan tenant bilgisi al
    const sessionRes = await fetch(
      `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/auth/me`,
      { headers: { cookie: req.headers.get("cookie") ?? "" } },
    );
    if (!sessionRes.ok) {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }
    const sessionJson = await sessionRes.json();
    const tenantId = sessionJson?.user?.tenantId ?? null;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === tenantId);
    if (!customer) {
      return NextResponse.json({ error: "Tenant kaydı bulunamadı" }, { status: 404 });
    }

    let meta: Record<string, any> = {};
    try {
      meta = customer.notes ? JSON.parse(customer.notes) : {};
    } catch {
      meta = {};
    }

    const subscriptionId = meta.lsSubscriptionId as string | undefined;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Aktif LemonSqueezy aboneliği bulunamadı", noSubscription: true },
        { status: 404 },
      );
    }

    const portalUrl = await getCustomerPortalUrl(subscriptionId);
    if (!portalUrl) {
      return NextResponse.json(
        { error: "Portal URL alınamadı — LemonSqueezy API erişimini kontrol edin" },
        { status: 503 },
      );
    }

    return NextResponse.json({ portalUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
