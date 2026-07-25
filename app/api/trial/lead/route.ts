import { NextResponse } from "next/server";
import { localId } from "@/lib/local-store";
import { logStudioAction } from "@/lib/studio-audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Unauthenticated and it writes a row per call, so it needs its own throttle.
  const limit = await checkRateLimit(req, { bucket: "trial-lead", limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await req.json();
    const { email, phone, source, deviceModel, estimatedPrice } = body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email zorunludur" }, { status: 400 });
    }

    const leadId = localId("lead");

    // logStudioAction writes to the StudioAuditLog table when a database is
    // configured; this route previously wrote only to the local JSON store, so
    // captured leads never reached the Studio in production.
    await logStudioAction({
      actor: "LeadCapture",
      action: "LEAD_CAPTURED",
      targetType: "LEAD",
      targetId: leadId,
      detail: `${email} from ${source || "buyback-calculator"} — ${deviceModel || "unknown"} (${estimatedPrice || 0} TL)`,
      context: { email, phone, source, deviceModel, estimatedPrice },
    });

    return NextResponse.json({ leadId, received: true });
  } catch (err: any) {
    console.error("Lead capture error:", err);
    return NextResponse.json({ error: "Kayit olusturulamadi" }, { status: 500 });
  }
}
