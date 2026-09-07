import { NextResponse } from "next/server";
import { getCustomerPortalUrl } from "@/lib/polar";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/subscriptions/portal
 * Oturum açmış tenant'in Polar customer portal URL'sini döner.
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

    const portalUrl = await getCustomerPortalUrl(tenantId);
    if (!portalUrl) {
      return NextResponse.json(
        { error: "Portal URL alınamadı — henüz aktif bir aboneliğiniz olmayabilir veya Polar API erişimini kontrol edin", noSubscription: true },
        { status: 404 },
      );
    }

    return NextResponse.json({ portalUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
