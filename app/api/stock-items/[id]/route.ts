import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";

let stockItemBuybackColumnsCache: boolean | null = null;
async function supportsStockItemBuybackColumns() {
  if (stockItemBuybackColumnsCache !== null) return stockItemBuybackColumnsCache;
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND lower(table_name) = lower('StockItem')
    `;
    const columns = new Set(rows.map((r) => String(r.column_name).toLowerCase()));
    stockItemBuybackColumnsCache =
      columns.has("isbuybackitem") &&
      columns.has("buybackprocessstatus") &&
      columns.has("buybacksaleenabled") &&
      columns.has("buybackdealid");
  } catch {
    stockItemBuybackColumnsCache = false;
  }
  return stockItemBuybackColumnsCache;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

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
      condition,
      purchaseDate,
      isBuybackItem,
      buybackProcessStatus,
      buybackSaleEnabled,
      buybackDealId,
    } = body;

    if (quantity !== undefined && Number(quantity) < 0) {
      return NextResponse.json({ error: "Stok miktarı negatif olamaz." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockLogs) store.stockLogs = [];

      const idx = store.stockItems.findIndex((x) => x.id === params.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
      }

      const existing = store.stockItems[idx];
      const effectiveImei = imei !== undefined ? (imei?.trim() || null) : ((existing as any).imei ?? null);
      if (effectiveImei) {
        const dup = store.stockItems.some(
          (x) =>
            x.id !== params.id &&
            (x as any).imei &&
            (x as any).imei.toLowerCase() === effectiveImei.toLowerCase() &&
            x.quantity > 0 &&
            (x as any).tenantId === (existing as any).tenantId,
        );
        if (dup) {
          return NextResponse.json({ error: `Bu IMEI numarası (${effectiveImei}) zaten stokta mevcut.` }, { status: 400 });
        }
      }
      const updatedItem = {
        ...existing,
        sku: sku !== undefined ? sku.trim() : existing.sku,
        name: name !== undefined ? name.trim() : existing.name,
        category: category !== undefined ? category.trim() : existing.category,
        brand: brand !== undefined ? (brand?.trim() || null) : (existing as any).brand ?? null,
        model: model !== undefined ? (model?.trim() || null) : (existing as any).model ?? null,
        variantColor: variantColor !== undefined ? (variantColor?.trim() || null) : (existing as any).variantColor ?? null,
        variantStorage: variantStorage !== undefined ? (variantStorage?.trim() || null) : (existing as any).variantStorage ?? null,
        serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : (existing as any).serialNumber ?? null,
        imei: imei !== undefined ? (imei?.trim() || null) : (existing as any).imei ?? null,
        quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
        salePrice: salePrice !== undefined ? Number(salePrice) : existing.salePrice,
        purchaseDocType: purchaseDocType !== undefined ? (purchaseDocType?.trim() || null) : (existing as any).purchaseDocType ?? null,
        purchaseDocNo: purchaseDocNo !== undefined ? (purchaseDocNo?.trim() || null) : (existing as any).purchaseDocNo ?? null,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : existing.minThreshold,
        condition: condition !== undefined ? condition : (existing as any).condition ?? null,
        isBuybackItem: isBuybackItem !== undefined ? Boolean(isBuybackItem) : Boolean((existing as any).isBuybackItem ?? false),
        buybackProcessStatus:
          buybackProcessStatus !== undefined ? buybackProcessStatus : ((existing as any).buybackProcessStatus ?? null),
        buybackSaleEnabled:
          buybackSaleEnabled !== undefined ? Boolean(buybackSaleEnabled) : Boolean((existing as any).buybackSaleEnabled ?? false),
        buybackDealId: buybackDealId !== undefined ? (buybackDealId || null) : ((existing as any).buybackDealId ?? null),
        purchaseDate: purchaseDate !== undefined ? purchaseDate : (existing as any).purchaseDate ?? null,
        updatedAt: new Date().toISOString(),
      };

      store.stockItems[idx] = updatedItem;
      if (!store.productBranchStocks) store.productBranchStocks = [];
      const defaultBranchId = store.branches?.[0]?.id;
      if (defaultBranchId) {
        const bsIdx = store.productBranchStocks.findIndex((x) => x.productId === updatedItem.id && x.branchId === defaultBranchId);
        if (bsIdx === -1) {
          store.productBranchStocks.push({
            id: localId("pbs"),
            productId: updatedItem.id,
            branchId: defaultBranchId,
            stock: updatedItem.quantity,
          });
        } else {
          store.productBranchStocks[bsIdx].stock = updatedItem.quantity;
        }
      }

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

    const existingItem = await prisma.stockItem.findFirst({ where: { id: params.id, tenantId: auth.user.tenantId } });
    if (!existingItem) {
      return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
    }

    const effectiveImei = imei !== undefined ? (imei?.trim() || null) : existingItem.imei;
    if (effectiveImei) {
      const dup = await prisma.stockItem.findFirst({
        where: {
          id: { not: params.id },
          imei: { equals: effectiveImei, mode: "insensitive" },
          quantity: { gte: 1 },
          tenantId: auth.user.tenantId,
        },
      });
      if (dup) {
        return NextResponse.json({ error: `Bu IMEI numarası (${effectiveImei}) zaten stokta mevcut (SKU: ${dup.sku}).` }, { status: 400 });
      }
    }

    const hasBuybackCols = await supportsStockItemBuybackColumns();
    const updated = await prisma.stockItem.update({
      where: { id: params.id },
      data: {
        sku: sku !== undefined ? sku.trim() : undefined,
        name: name !== undefined ? name.trim() : undefined,
        category: category !== undefined ? category.trim() : undefined,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
        purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : undefined,
        salePrice: salePrice !== undefined ? Number(salePrice) : undefined,
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : undefined,
        brand: brand !== undefined ? (brand?.trim() || null) : undefined,
        model: model !== undefined ? (model?.trim() || null) : undefined,
        variantColor: variantColor !== undefined ? (variantColor?.trim() || null) : undefined,
        variantStorage: variantStorage !== undefined ? (variantStorage?.trim() || null) : undefined,
        serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : undefined,
        imei: imei !== undefined ? (imei?.trim() || null) : undefined,
        purchaseDocType: purchaseDocType !== undefined ? (purchaseDocType?.trim() || null) : undefined,
        purchaseDocNo: purchaseDocNo !== undefined ? (purchaseDocNo?.trim() || null) : undefined,
        condition: condition !== undefined ? condition : undefined,
        ...(hasBuybackCols
          ? {
              isBuybackItem: isBuybackItem !== undefined ? Boolean(isBuybackItem) : undefined,
              buybackProcessStatus: buybackProcessStatus !== undefined ? buybackProcessStatus : undefined,
              buybackSaleEnabled: buybackSaleEnabled !== undefined ? Boolean(buybackSaleEnabled) : undefined,
              buybackDealId: buybackDealId !== undefined ? (buybackDealId || null) : undefined,
            }
          : {}),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      },
    });

    const defaultBranch = await prisma.branch.findFirst({
      where: { tenantId: auth.user.tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const existingProduct = await prisma.product.findFirst({
      where: {
        barcode: existingItem.sku,
        tenantId: auth.user.tenantId ?? null,
      },
      select: { id: true },
    });

    const syncedProduct = existingProduct
      ? await prisma.product.update({
      where: { id: existingProduct.id },
      data: {
        name: updated.name,
        barcode: updated.sku,
        category: updated.category,
        brand: updated.brand,
        model: updated.model,
        variantColor: updated.variantColor,
        variantStorage: updated.variantStorage,
        serialNumber: updated.serialNumber,
        imei: updated.imei,
        stock: updated.quantity,
        purchasePrice: updated.purchasePrice,
        salePrice: updated.salePrice,
        purchaseDocType: updated.purchaseDocType,
        purchaseDocNo: updated.purchaseDocNo,
        condition: updated.condition,
        purchaseDate: updated.purchaseDate,
      },
    })
      : await prisma.product.create({
      data: {
        name: updated.name,
        barcode: updated.sku,
        category: updated.category,
        brand: updated.brand,
        model: updated.model,
        variantColor: updated.variantColor,
        variantStorage: updated.variantStorage,
        serialNumber: updated.serialNumber,
        imei: updated.imei,
        stock: updated.quantity,
        purchasePrice: updated.purchasePrice,
        salePrice: updated.salePrice,
        purchaseDocType: updated.purchaseDocType,
        purchaseDocNo: updated.purchaseDocNo,
        condition: updated.condition,
        purchaseDate: updated.purchaseDate,
        tenantId: auth.user.tenantId,
      },
    });

    if (defaultBranch) {
      await prisma.productBranchStock.upsert({
        where: {
          productId_branchId: {
            productId: syncedProduct.id,
            branchId: defaultBranch.id,
          },
        },
        create: {
          productId: syncedProduct.id,
          branchId: defaultBranch.id,
          stock: updated.quantity,
        },
        update: {
          stock: updated.quantity,
        },
      });
    }

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
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
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
      if (store.productBranchStocks) {
        store.productBranchStocks = store.productBranchStocks.filter((x) => x.productId !== item.id);
      }

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

    const item = await prisma.stockItem.findFirst({ where: { id: params.id, tenantId: auth.user.tenantId } });
    if (!item) {
      return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
    }

    try {
      await prisma.$transaction([
        prisma.stockItem.delete({ where: { id: params.id } }),
        prisma.product.deleteMany({
          where: {
            barcode: item.sku,
            tenantId: auth.user.tenantId,
          },
        }),
      ]);

      await writeAuditLog({
        action: "STOCK_DELETE",
        entityType: "StockItem",
        entityId: params.id,
        detail: `Stok Karti Silindi: ${item.sku} - ${item.name}`,
        actorUserId: auth.user?.userId,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        await prisma.$transaction([
          prisma.stockItem.update({ where: { id: params.id }, data: { isActive: false } }),
          prisma.product.updateMany({
            where: { barcode: item.sku, tenantId: auth.user.tenantId },
            data: { isActive: false },
          }),
        ]);

        await writeAuditLog({
          action: "STOCK_ARCHIVE",
          entityType: "StockItem",
          entityId: params.id,
          detail: `Stok Karti Arsivlendi (satis gecmisi oldugu icin tam silinemedi): ${item.sku} - ${item.name}`,
          actorUserId: auth.user?.userId,
        });

        return NextResponse.json({
          success: true,
          archived: true,
          message: "Bu urun satis gecmisinde kullanildigi icin tamamen silinemedi; envanterden kaldirildi (arsivlendi).",
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, "Silme islemi basarisiz.") }, { status: getErrorStatus(error) });
  }
}
