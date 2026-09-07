import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { createCheckoutUrl, getProductId, type BillingCycle } from "@/lib/polar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/subscriptions/direct-checkout
 * Public, unauthenticated — lets a visitor buy VibeGSM straight from the
 * marketing site, no trial/account first. A fresh tenant id is generated up
 * front and handed to Polar as external_customer_id; the actual account is
 * only created once the payment succeeds (see /api/subscriptions/complete),
 * so an abandoned checkout never leaves an orphaned tenant behind.
 */

function normalizeTrPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  return digits;
}

export async function POST(req: Request) {
  const limit = await checkRateLimit(req, { bucket: "direct-checkout", limit: 5, windowMs: 60 * 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await req.json();
    const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";
    const fullName = (typeof body.fullName === "string" ? body.fullName.trim() : "") || shopName;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? normalizeTrPhone(body.phone) : "";
    const cycle: BillingCycle = body.cycle === "annual" ? "annual" : "monthly";

    if (!shopName) return NextResponse.json({ error: "Bayi adı zorunludur" }, { status: 400 });
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir email adresi giriniz" }, { status: 400 });
    }
    if (!/^5\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Telefon numarası 5 ile başlayan 10 haneli olmalıdır (örn: 5XX XXX XX XX)" }, { status: 400 });
    }

    // An existing account should log in and (re)subscribe from inside the
    // app, not spin up a second tenant tied to the same email.
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (store.users.some((u) => u.email.toLowerCase() === email)) {
        return NextResponse.json(
          { error: "Bu email ile zaten bir hesabınız var. Lütfen giriş yapıp abonelik sayfasından ödeme yapın." },
          { status: 409 },
        );
      }
    } else {
      const existing = await prisma.appUser.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        return NextResponse.json(
          { error: "Bu email ile zaten bir hesabınız var. Lütfen giriş yapıp abonelik sayfasından ödeme yapın." },
          { status: 409 },
        );
      }
    }

    let productId: string;
    try {
      productId = getProductId(cycle);
    } catch (e: any) {
      return NextResponse.json({ error: e.message, hint: "Polar ürün ID'lerini .env dosyasına ekleyin" }, { status: 503 });
    }

    const tenantId = `buyer-${crypto.randomUUID()}`;
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

    const result = await createCheckoutUrl({
      productId,
      tenantId,
      tenantEmail: email,
      tenantName: shopName,
      customData: {
        direct_purchase: "1",
        shopName,
        fullName,
        phone,
        cycle,
      },
      redirectUrl: `${baseUrl}/satin-al/basarili?checkout_id={CHECKOUT_ID}`,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error("[direct-checkout]", err);
    return NextResponse.json({ error: err.message ?? "Checkout oluşturulamadı" }, { status: 500 });
  }
}
