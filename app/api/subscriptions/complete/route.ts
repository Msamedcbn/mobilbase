import { NextResponse } from "next/server";
import { getCheckout } from "@/lib/polar";
import { provisionPaidTenant } from "@/lib/direct-purchase";

/**
 * GET /api/subscriptions/complete?checkout_id=...
 * Public, unauthenticated — this is what the checkout success redirect from
 * /api/subscriptions/direct-checkout lands on. Verifies the checkout with
 * Polar itself (never trusts the query string alone), provisions the tenant
 * on first landing, and logs the browser straight in.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkoutId = url.searchParams.get("checkout_id");
  if (!checkoutId) return NextResponse.json({ error: "checkout_id eksik" }, { status: 400 });

  const checkout = await getCheckout(checkoutId);
  if (!checkout) return NextResponse.json({ error: "Checkout bulunamadı" }, { status: 404 });

  if (checkout.status !== "succeeded" && checkout.status !== "confirmed") {
    return NextResponse.json({ error: "Ödeme henüz tamamlanmadı", status: checkout.status }, { status: 409 });
  }

  const tenantId = checkout.externalCustomerId;
  if (!tenantId) return NextResponse.json({ error: "Tenant bilgisi bulunamadı" }, { status: 400 });

  const meta = checkout.metadata ?? {};
  const shopName = (typeof meta.shopName === "string" && meta.shopName.trim()) || "Yeni Bayi";
  const fullName = (typeof meta.fullName === "string" && meta.fullName.trim()) || shopName;
  const phone = typeof meta.phone === "string" ? meta.phone : "";

  try {
    const result = await provisionPaidTenant({
      tenantId,
      shopName,
      ownerName: fullName,
      ownerEmail: checkout.customerEmail ?? "",
      ownerPhone: phone,
      subscriptionId: checkout.subscriptionId,
    });

    const response = NextResponse.json({
      ok: true,
      email: checkout.customerEmail,
      shopName,
      temporaryPassword: result.temporaryPassword,
      isNew: result.isNew,
    });

    const isHttpsBaseUrl = (process.env.APP_BASE_URL ?? "").toLowerCase().startsWith("https://");
    response.cookies.set("tp_session", result.sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production" && isHttpsBaseUrl,
    });

    return response;
  } catch (err: any) {
    console.error("[subscriptions/complete]", err);
    return NextResponse.json({ error: "Hesap oluşturulamadı, lütfen destek ile iletişime geçin" }, { status: 500 });
  }
}
