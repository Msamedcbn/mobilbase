import { NextResponse } from "next/server";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, phone, source, deviceModel, estimatedPrice } = body || {};

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email zorunludur" }, { status: 400 });
    }

    const store = await readLocalStore();

    const leadId = localId("lead");

    store.studioAuditLogs = store.studioAuditLogs || [];
    store.studioAuditLogs.unshift({
      id: localId("audit"),
      createdAt: new Date().toISOString(),
      actor: "LeadCapture",
      action: "LEAD_CAPTURED",
      targetType: "LEAD",
      targetId: leadId,
      detail: `${email} from ${source || "buyback-calculator"} — ${deviceModel || "unknown"} (${estimatedPrice || 0} TL)`,
      context: { email, phone, source, deviceModel, estimatedPrice },
    });

    await writeLocalStore(store);

    return NextResponse.json({ leadId, received: true });
  } catch (err: any) {
    console.error("Lead capture error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
