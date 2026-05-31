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

async function resolveStockItemId(rawId: string, tenantId: string | null | undefined) {
  if (!rawId.startsWith("legacy-product-")) return rawId;
  const productId = rawId.replace("legacy-product-", "");
  if (!productId) return null;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenantId ?? null },
  });
  if (!product) return null;

  const existing = await prisma.stockItem.findFirst({
    where: { sku: product.barcode, tenantId: tenantId ?? null, isCatalog: false },
  });
  if (existing) return existing.id;

  const created = await prisma.stockItem.create({
    data: {
      sku: product.barcode,
      name: product.name,
      category: product.category || "Genel",
      brand: product.brand,
      model: product.model,
      variantColor: product.variantColor,
      variantStorage: product.variantStorage,
      serialNumber: product.serialNumber,
      imei: product.imei,
      quantity: Number(product.stock || 0),
      purchasePrice: Number(product.purchasePrice || 0),
      salePrice: Number(product.salePrice || 0),
      purchaseDocType: product.purchaseDocType,
      purchaseDocNo: product.purchaseDocNo,
      minThreshold: 0,
      isCatalog: false,
      condition: product.condition,
      purchaseDate: product.purchaseDate,
      tenantId: tenantId ?? null,
    },
  });

  return created.id;
}

async function createCostEventInLocalStore(input: {
  itemId: string;
  tenantId: string | null | undefined;
  type: CostEventType;
  amount: number;
  explicitDelta: number | null;
  note: string | null;
  referenceNo: string | null;
}) {
  const store = await readLocalStore();
  if (!store.stockItems) store.stockItems = [];
  if (!store.stockCostEvents) store.stockCostEvents = [];
  if (!store.stockLogs) store.stockLogs = [];

  const idx = store.stockItems.findIndex((x) => {
    if (x.id !== input.itemId) return false;
    if (input.tenantId == null) return true;
    return x.tenantId === input.tenantId;
  });
  if (idx === -1) return null;

  const item = store.stockItems[idx];
  const qty = Math.max(1, Number(item.quantity || 1));
  const costDelta = input.explicitDelta ?? defaultDeltaByType(input.type, input.amount);
  const unitCostAfter = Math.max(0, Number(item.purchasePrice || 0) + costDelta / qty);

  item.purchasePrice = unitCostAfter;
  item.updatedAt = new Date().toISOString();

  const event = {
    id: localId("stock-cost"),
    stockItemId: item.id,
    type: input.type,
    amount: input.amount,
    costDelta,
    unitCostAfter,
    note: input.note,
    referenceNo: input.referenceNo,
    createdAt: new Date().toISOString(),
  };
  store.stockCostEvents.unshift(event);

  store.stockLogs.unshift({
    id: localId("stock-log"),
    action: "STOCK_COST_EVENT",
    entityId: item.id,
    detail: `Maliyet hareketi: ${input.type} / Tutar: ${input.amount} / Delta: ${costDelta} / Yeni Birim Maliyet: ${unitCostAfter}`,
    createdAt: new Date().toISOString(),
  });

  await writeLocalStore(store);
  return { item, event };
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

  const resolvedId = await resolveStockItemId(params.id, tenantId);
  if (!resolvedId) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

  const item = await prisma.stockItem.findFirst({ where: { id: resolvedId, tenantId } });
  if (!item) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

  const events = await prisma.stockCostEvent.findMany({
    where: { stockItemId: resolvedId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ item, events });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  let parsedBody: any = null;

  try {
    const body = await req.json();
    parsedBody = body;
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
      const localResult = await createCostEventInLocalStore({
        itemId: params.id,
        tenantId,
        type,
        amount,
        explicitDelta,
        note,
        referenceNo,
      });
      if (!localResult) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
      return NextResponse.json(localResult, { status: 201 });
    }

    const resolvedId = await resolveStockItemId(params.id, tenantId);
    if (!resolvedId) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({ where: { id: resolvedId, tenantId } });
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

    try {
      await writeAuditLog({
        action: "STOCK_COST_EVENT",
        entityType: "StockItem",
        entityId: result.updated.id,
        detail: `Maliyet hareketi: ${result.event.type} / Delta: ${result.event.costDelta.toString()} / Yeni Maliyet: ${result.event.unitCostAfter.toString()}`,
        actorUserId: auth.user?.userId,
      });
    } catch (auditError) {
      console.error("Audit log yazılamadı:", auditError);
    }

    return NextResponse.json({ item: result.updated, event: result.event }, { status: 201 });
  } catch (error) {
    try {
      const body = parsedBody || {};
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

      if (allowed.includes(type) && Number.isFinite(amount) && amount >= 0) {
        const localResult = await createCostEventInLocalStore({
          itemId: params.id,
          tenantId,
          type,
          amount,
          explicitDelta,
          note,
          referenceNo,
        });
        if (localResult) {
          return NextResponse.json(localResult, { status: 201 });
        }
      }
    } catch (fallbackError) {
      console.error("Fallback local-store maliyet kaydı da başarısız:", fallbackError);
    }

    console.error("Maliyet hareketi kaydedilemedi:", error);
    return NextResponse.json({ error: "Maliyet hareketi kaydedilemedi." }, { status: 500 });
  }
}

