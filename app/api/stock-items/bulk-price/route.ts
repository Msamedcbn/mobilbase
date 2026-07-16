import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";

export async function PATCH(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  const mode = body?.mode;
  const value = Number(body?.value);

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Ürün seçimi geçersiz." }, { status: 400 });
  }
  if (mode !== "FIXED" && mode !== "MARKUP") {
    return NextResponse.json({ error: "Geçersiz güncelleme modu." }, { status: 400 });
  }
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Geçerli bir değer girin." }, { status: 400 });
  }

  const computeSalePrice = (purchasePrice: number) =>
    mode === "FIXED" ? value : Math.round(purchasePrice * (1 + value / 100) * 100) / 100;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      let updated = 0;
      for (const item of store.stockItems) {
        if (!ids.includes(item.id) || item.tenantId !== tenantId) continue;
        item.salePrice = computeSalePrice(Number(item.purchasePrice || 0));
        item.updatedAt = new Date().toISOString();
        updated++;
      }
      await writeLocalStore(store);
      return NextResponse.json({ updated });
    }

    const items = await prisma.stockItem.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, sku: true, purchasePrice: true },
    });
    if (items.length === 0) return NextResponse.json({ updated: 0 });

    const updates = items.map((item) =>
      prisma.stockItem.update({
        where: { id: item.id },
        data: { salePrice: computeSalePrice(Number(item.purchasePrice)) },
      }),
    );

    const productUpdates = items.map((item) =>
      prisma.product.updateMany({
        where: { barcode: item.sku, tenantId },
        data: { salePrice: computeSalePrice(Number(item.purchasePrice)) },
      }),
    );

    await prisma.$transaction([...updates, ...productUpdates]);

    await writeAuditLog({
      action: "STOCK_BULK_PRICE_UPDATE",
      entityType: "StockItem",
      detail: `${items.length} urun icin toplu fiyat guncellemesi (mod: ${mode}, deger: ${value})`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json({ updated: items.length });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Toplu guncelleme basarisiz.") }, { status: getErrorStatus(error) });
  }
}
