import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

type ServiceFlowEventType = "INTERNAL_SELL_TO_SERVICE" | "INTERNAL_BUYBACK_FROM_SERVICE" | "MANUAL_ADJUSTMENT";
const STEP3_MARKER = "__INTERNAL_SERVICE_STEP3_COMPLETED__";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const stockItems = (store.stockItems || []).filter((x) => x.tenantId === tenantId);
    const events = (store.stockCostEvents || []).filter(
      (e) =>
        e.type === "INTERNAL_SELL_TO_SERVICE" ||
        e.type === "INTERNAL_BUYBACK_FROM_SERVICE" ||
        e.type === "MANUAL_ADJUSTMENT",
    );
    const statusByItem = new Map<string, { hasSent: boolean; isStep3Done: boolean }>();
    for (const ev of events) {
      const current = statusByItem.get(ev.stockItemId) || { hasSent: false, isStep3Done: false };
      if (ev.type === "INTERNAL_SELL_TO_SERVICE") current.hasSent = true;
      if (ev.type === "MANUAL_ADJUSTMENT" && String(ev.note || "").includes(STEP3_MARKER)) current.isStep3Done = true;
      statusByItem.set(ev.stockItemId, current);
    }

    const inServiceItems = stockItems.filter((item) => {
      const status = statusByItem.get(item.id);
      return Boolean(status?.hasSent) && !Boolean(status?.isStep3Done);
    });
    return NextResponse.json(inServiceItems);
  }

  const stockItems = await prisma.stockItem.findMany({
    where: { tenantId: tenantId ?? null },
    orderBy: { updatedAt: "desc" },
  });

  const events = await prisma.stockCostEvent.findMany({
    where: {
      stockItem: { tenantId: tenantId ?? null },
      type: { in: ["INTERNAL_SELL_TO_SERVICE", "INTERNAL_BUYBACK_FROM_SERVICE", "MANUAL_ADJUSTMENT"] },
    },
    select: { stockItemId: true, type: true, note: true },
  });

  const statusByItem = new Map<string, { hasSent: boolean; isStep3Done: boolean }>();
  for (const ev of events) {
    const current = statusByItem.get(ev.stockItemId) || { hasSent: false, isStep3Done: false };
    if (ev.type === "INTERNAL_SELL_TO_SERVICE") current.hasSent = true;
    if (ev.type === "MANUAL_ADJUSTMENT" && String(ev.note || "").includes(STEP3_MARKER)) current.isStep3Done = true;
    statusByItem.set(ev.stockItemId, current);
  }

  const inServiceItems = stockItems.filter((item) => {
    const status = statusByItem.get(item.id);
    return Boolean(status?.hasSent) && !Boolean(status?.isStep3Done);
  });
  return NextResponse.json(inServiceItems);
}
