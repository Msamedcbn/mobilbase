import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

type CostEventType =
  | "PURCHASE_EXTERNAL"
  | "INTERNAL_SELL_TO_SERVICE"
  | "SERVICE_COST_LABOR"
  | "SERVICE_COST_PART"
  | "INTERNAL_BUYBACK_FROM_SERVICE"
  | "MANUAL_ADJUSTMENT";

function defaultDeltaByType(type: CostEventType, amount: number) {
  switch (type) {
    case "PURCHASE_EXTERNAL":
    case "SERVICE_COST_LABOR":
    case "SERVICE_COST_PART":
    case "INTERNAL_BUYBACK_FROM_SERVICE":
      return amount;
    case "INTERNAL_SELL_TO_SERVICE":
      return 0;
    case "MANUAL_ADJUSTMENT":
      return amount;
    default:
      return 0;
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.stockItems || []).find((x) => x.id === params.id && x.tenantId === tenantId);
    if (!item) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

    const events = (store.stockCostEvents || [])
      .filter((e) => e.stockItemId === params.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ item, events });
  }

  const item = await prisma.stockItem.findFirst({ where: { id: params.id, tenantId } });
  if (!item) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

  const events = await prisma.stockCostEvent.findMany({
    where: { stockItemId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ item, events });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const type = String(body.type || "") as CostEventType;
    const amount = Number(body.amount || 0);
    const explicitDelta = body.costDelta !== undefined ? Number(body.costDelta) : null;
    const note = body.note ? String(body.note) : null;
    const referenceNo = body.referenceNo ? String(body.referenceNo) : null;

    const allowed: CostEventType[] = [
      "PURCHASE_EXTERNAL",
      "INTERNAL_SELL_TO_SERVICE",
      "SERVICE_COST_LABOR",
      "SERVICE_COST_PART",
      "INTERNAL_BUYBACK_FROM_SERVICE",
      "MANUAL_ADJUSTMENT",
    ];

    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Gecersiz hareket tipi." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Tutar gecersiz." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockCostEvents) store.stockCostEvents = [];
      if (!store.stockLogs) store.stockLogs = [];

      const idx = store.stockItems.findIndex((x) => x.id === params.id && x.tenantId === tenantId);
      if (idx === -1) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

      const item = store.stockItems[idx];
      const qty = Math.max(1, Number(item.quantity || 1));
      const costDelta = explicitDelta ?? defaultDeltaByType(type, amount);
      const unitCostAfter = Math.max(0, Number(item.purchasePrice || 0) + costDelta / qty);

      item.purchasePrice = unitCostAfter;
      item.updatedAt = new Date().toISOString();

      const event = {
        id: localId("stock-cost"),
        stockItemId: item.id,
        type,
        amount,
        costDelta,
        unitCostAfter,
        note,
        referenceNo,
        createdAt: new Date().toISOString(),
      };
      store.stockCostEvents.unshift(event);

      store.stockLogs.unshift({
        id: localId("stock-log"),
        action: "STOCK_COST_EVENT",
        entityId: item.id,
        detail: `Maliyet hareketi: ${type} / Tutar: ${amount} / Delta: ${costDelta} / Yeni Birim Maliyet: ${unitCostAfter}`,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return NextResponse.json({ item, event }, { status: 201 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({ where: { id: params.id, tenantId } });
      if (!item) return null;

      const qty = Math.max(1, Number(item.quantity || 1));
      const costDelta = explicitDelta ?? defaultDeltaByType(type, amount);
      const unitCostAfter = Math.max(0, Number(item.purchasePrice) + costDelta / qty);

      const updated = await tx.stockItem.update({
        where: { id: item.id },
        data: { purchasePrice: unitCostAfter },
      });

      const event = await tx.stockCostEvent.create({
        data: {
          stockItemId: item.id,
          type,
          amount,
          costDelta,
          unitCostAfter,
          note,
          referenceNo,
        },
      });

      return { updated, event };
    });

    if (!result) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

    await writeAuditLog({
      action: "STOCK_COST_EVENT",
      entityType: "StockItem",
      entityId: result.updated.id,
      detail: `Maliyet hareketi: ${result.event.type} / Delta: ${result.event.costDelta.toString()} / Yeni Maliyet: ${result.event.unitCostAfter.toString()}`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json({ item: result.updated, event: result.event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Maliyet hareketi kaydedilemedi." }, { status: 500 });
  }
}
