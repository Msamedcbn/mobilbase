import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { sku, name, category, quantity, purchasePrice, salePrice, minThreshold } = body;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockLogs) store.stockLogs = [];

      const idx = store.stockItems.findIndex((x) => x.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
      }

      const existing = store.stockItems[idx];
      const updatedItem = {
        ...existing,
        sku: sku !== undefined ? sku.trim() : existing.sku,
        name: name !== undefined ? name.trim() : existing.name,
        category: category !== undefined ? category.trim() : existing.category,
        quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
        salePrice: salePrice !== undefined ? Number(salePrice) : existing.salePrice,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : existing.minThreshold,
        updatedAt: new Date().toISOString(),
      };

      store.stockItems[idx] = updatedItem;

      const logDetail = `Stok Karti Guncellendi: ${updatedItem.sku} - ${updatedItem.name} (Adet: ${updatedItem.quantity}, Fiyat: ${updatedItem.salePrice} TL)`;
      store.stockLogs.unshift({
        id: localId("stock-log"),
        action: "STOCK_UPDATE",
        entityId: params.id,
        detail: logDetail,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return NextResponse.json(updatedItem);
    }

    const updated = await prisma.stockItem.update({
      where: { id: params.id },
      data: body,
    });

    await writeAuditLog({
      action: "STOCK_UPDATE",
      entityType: "StockItem",
      entityId: updated.id,
      detail: `Stok Karti Guncellendi: ${updated.sku} - ${updated.name} (Adet: ${updated.quantity}, Fiyat: ${updated.salePrice} TL)`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Guncelleme islemi basarisiz." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockLogs) store.stockLogs = [];

      const idx = store.stockItems.findIndex((x) => x.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
      }

      const item = store.stockItems[idx];
      store.stockItems.splice(idx, 1);

      const logDetail = `Stok Karti Silindi: ${item.sku} - ${item.name}`;
      store.stockLogs.unshift({
        id: localId("stock-log"),
        action: "STOCK_DELETE",
        entityId: params.id,
        detail: logDetail,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return NextResponse.json({ success: true });
    }

    const item = await prisma.stockItem.findUnique({ where: { id: params.id } });
    if (!item) {
      return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
    }

    await prisma.stockItem.delete({ where: { id: params.id } });

    await writeAuditLog({
      action: "STOCK_DELETE",
      entityType: "StockItem",
      entityId: params.id,
      detail: `Stok Karti Silindi: ${item.sku} - ${item.name}`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Silme islemi basarisiz." }, { status: 500 });
  }
}

