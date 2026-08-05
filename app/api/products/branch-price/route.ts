import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const body = await req.json();
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const branchId = typeof body?.branchId === "string" ? body.branchId : "";
  const rawPrice = body?.price;
  const clearOverride = rawPrice === null || rawPrice === "";
  const price = clearOverride ? null : Number(rawPrice);

  if (!productId || !branchId) {
    return NextResponse.json({ error: "Ürün ve şube seçimi zorunlu" }, { status: 400 });
  }
  if (!clearOverride && (!Number.isFinite(price) || (price as number) < 0)) {
    return NextResponse.json({ error: "Geçerli bir fiyat girin" }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const product = store.stockItems?.find((p) => p.id === productId && p.tenantId === tenantId);
    if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

    if (!store.productBranchStocks) store.productBranchStocks = [];
    const idx = store.productBranchStocks.findIndex((s) => s.productId === productId && s.branchId === branchId);
    if (idx === -1) {
      store.productBranchStocks.push({
        id: `pbs-${Math.random().toString(36).substr(2, 9)}`,
        productId,
        branchId,
        stock: 0,
        price: clearOverride ? null : price,
      });
    } else {
      store.productBranchStocks[idx].price = clearOverride ? null : price;
    }
    await writeLocalStore(store);
    return NextResponse.json({ success: true, price: clearOverride ? null : price });
  }

  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  await prisma.productBranchStock.upsert({
    where: { productId_branchId: { productId, branchId } },
    update: { price: clearOverride ? null : price },
    create: { productId, branchId, stock: 0, price: clearOverride ? null : price },
  });

  return NextResponse.json({ success: true, price: clearOverride ? null : price });
}
