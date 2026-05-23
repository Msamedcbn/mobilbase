import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { requireRole, getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return NextResponse.json((store.stockItems || []).filter((x) => x.tenantId === tenantId));
  }

  try {
    const items = await prisma.stockItem.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Veriler yuklenemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const { sku, name, category, quantity, purchasePrice, salePrice, minThreshold } = body;
    
    if (!sku || !name) {
      return NextResponse.json({ error: "SKU ve urun adi zorunludur." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockLogs) store.stockLogs = [];

      const exists = store.stockItems.some((x) => x.sku.toLowerCase() === sku.toLowerCase() && x.tenantId === tenantId);
      if (exists) {
        return NextResponse.json({ error: "Bu SKU zaten kayitli." }, { status: 409 });
      }

      const newItem = {
        id: localId("stock-item"),
        sku: sku.trim(),
        name: name.trim(),
        category: category || "Genel",
        quantity: Number(quantity || 0),
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        minThreshold: Number(minThreshold || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId,
      };

      store.stockItems.push(newItem);
      
      const logDetail = `Yeni Stok Karti Eklendi: ${sku} - ${name} (Adet: ${quantity})`;
      store.stockLogs.unshift({
        id: localId("stock-log"),
        action: "STOCK_ADD",
        entityId: newItem.id,
        detail: logDetail,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return NextResponse.json(newItem, { status: 201 });
    }

    const item = await prisma.stockItem.create({
      data: {
        sku,
        name,
        category: category || "Genel",
        quantity: Number(quantity || 0),
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        minThreshold: Number(minThreshold || 0),
        tenantId,
      }
    });
    
    await writeAuditLog({
      action: "STOCK_ADD",
      entityType: "StockItem",
      entityId: item.id,
      detail: `Yeni Stok Karti Eklendi: ${item.sku} - ${item.name} (Adet: ${item.quantity})`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Kayit islemi basarisiz." }, { status: 500 });
  }
}

