import { NextResponse } from "next/server";
import { listReferralCodes, normalizeReferralCode, isReferralCodeUsable } from "@/lib/marketing";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/referral-codes/validate?code=XXX
 * Public, unauthenticated — lets the signup form preview a code's discount
 * before submitting. Does NOT consume the code (usage is only incremented
 * when a trial actually starts with it, in /api/trial/start).
 */
export async function GET(req: Request) {
  const limit = await checkRateLimit(req, { bucket: "referral-validate", limit: 20, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const url = new URL(req.url);
  const raw = url.searchParams.get("code") ?? "";
  const code = normalizeReferralCode(raw);
  if (!code) return NextResponse.json({ valid: false });

  try {
    const codes = await listReferralCodes();
    const found = codes.find((c) => c.code === code);
    if (!found || !isReferralCodeUsable(found)) {
      return NextResponse.json({ valid: false });
    }
    return NextResponse.json({
      valid: true,
      ownerName: found.ownerName,
      discountType: found.discountType,
      discountValue: found.discountValue,
    });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
