import { NextResponse } from "next/server";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";
import { getTenantMetadata } from "@/lib/tenant-store";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/subscriptions/portal
 * Oturum acmis tenant'in LemonSqueezy customer portal URL'sini doner.
 */
export async function GET(req: Request) {
  try {
    const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"]);
    if (auth.error) return auth.error;
    // requireRole already verified the session; the previous fetch to
    // /api/auth/me was an extra network hop for data we already have.
    const tenantId = auth.user.tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    }

    const meta = await getTenantMetadata(tenantId);
    if (!meta) {
      return NextResponse.json({ error: "Tenant kaydı bulunamadı" }, { status: 404 });
    }

    const subscriptionId = (meta as Record<string, any>).lsSubscriptionId as string | undefined;
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
