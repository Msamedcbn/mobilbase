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
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const {
      sku,
      name,
      category,
      brand,
      model,
      variantColor,
      variantStorage,
      serialNumber,
      imei,
      quantity,
      purchasePrice,
      salePrice,
      purchaseDocType,
      purchaseDocNo,
      minThreshold,
    } = body;
    
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
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        variantColor: variantColor?.trim() || null,
        variantStorage: variantStorage?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        imei: imei?.trim() || null,
        quantity: Number(quantity || 0),
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        purchaseDocType: purchaseDocType?.trim() || null,
        purchaseDocNo: purchaseDocNo?.trim() || null,
        minThreshold: Number(minThreshold || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId,
      };

      store.stockItems.push(newItem);
      if (!store.productBranchStocks) store.productBranchStocks = [];
      const targetBranchId = store.branches?.[0]?.id;
      if (targetBranchId) {
        store.productBranchStocks.push({
          id: localId("pbs"),
          productId: newItem.id,
          branchId: targetBranchId,
          stock: newItem.quantity,
        });
      }
      
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
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        variantColor: variantColor?.trim() || null,
        variantStorage: variantStorage?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        imei: imei?.trim() || null,
        purchaseDocType: purchaseDocType?.trim() || null,
        purchaseDocNo: purchaseDocNo?.trim() || null,
        minThreshold: Number(minThreshold || 0),
        tenantId,
      }
    });

    const defaultBranch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const existingProduct = await prisma.product.findFirst({
      where: {
        barcode: item.sku,
        tenantId: tenantId ?? null,
      },
      select: { id: true },
    });

    const createdProduct = existingProduct
      ? await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name: item.name,
        category: item.category,
        brand: item.brand,
        model: item.model,
        variantColor: item.variantColor,
        variantStorage: item.variantStorage,
        serialNumber: item.serialNumber,
        imei: item.imei,
        stock: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        purchaseDocType: item.purchaseDocType,
        purchaseDocNo: item.purchaseDocNo,
      },
    })
      : await prisma.product.create({
      data: {
        name: item.name,
        barcode: item.sku,
        category: item.category,
        brand: item.brand,
        model: item.model,
        variantColor: item.variantColor,
        variantStorage: item.variantStorage,
        serialNumber: item.serialNumber,
        imei: item.imei,
        stock: item.quantity,
        purchasePrice: item.purchasePrice,
        salePrice: item.salePrice,
        purchaseDocType: item.purchaseDocType,
        purchaseDocNo: item.purchaseDocNo,
        tenantId,
      },
    });

    if (defaultBranch) {
      await prisma.productBranchStock.upsert({
        where: {
          productId_branchId: {
            productId: createdProduct.id,
            branchId: defaultBranch.id,
          },
        },
        create: {
          productId: createdProduct.id,
          branchId: defaultBranch.id,
          stock: item.quantity,
        },
        update: {
          stock: item.quantity,
        },
      });
    }
    
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

