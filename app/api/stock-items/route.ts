import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { requireRole, getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

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

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;
  if (user.role !== "PLATFORM_OWNER" && !tenantId) {
    return NextResponse.json({ error: "Tenant atamasi olmayan kullanici envantere erisemez." }, { status: 403 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const stockItems = store.stockItems || [];
    if (user.role === "PLATFORM_OWNER" && !tenantId) return NextResponse.json(stockItems);
    return NextResponse.json(stockItems.filter((x) => x.tenantId === tenantId));
  }

  const mapLegacyProducts = async () => {
    const products = await prisma.product.findMany({
      where: tenantId ? { tenantId, isCatalog: false, isActive: true } : { tenantId: null, isCatalog: false, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return products.map((p) => ({
      id: `legacy-product-${p.id}`,
      sku: p.barcode,
      name: p.name,
      category: p.category || "Genel",
      brand: p.brand,
      model: p.model,
      variantColor: p.variantColor,
      variantStorage: p.variantStorage,
      serialNumber: p.serialNumber,
      imei: p.imei,
      quantity: Number(p.stock || 0),
      purchasePrice: Number(p.purchasePrice || 0),
      salePrice: Number(p.salePrice || 0),
      minThreshold: 0,
      isCatalog: false,
      condition: p.condition,
      purchaseDate: p.purchaseDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tenantId: p.tenantId,
    }));
  };

  try {
    const items = await prisma.stockItem.findMany({
      where: tenantId ? { tenantId, isActive: true } : { tenantId: null, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    // Legacy uyumluluk: eski veriler Product tablosunda kalmış olabilir.
    const legacyItems = await mapLegacyProducts();
    const knownSkus = new Set(items.map((x) => String(x.sku || "").toLowerCase()));
    const merged = [...items, ...legacyItems.filter((x) => !knownSkus.has(String(x.sku || "").toLowerCase()))];
    return NextResponse.json(merged);
  } catch (error) {
    try {
      const mapped = await mapLegacyProducts();
      return NextResponse.json(mapped);
    } catch {
      // ignore fallback failure
    }
    return NextResponse.json({ error: "Veriler yüklenemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    let {
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
      requiresSerialNumber,
    } = body;

    if (!sku || !name) {
      return NextResponse.json({ error: "SKU ve ürün adı zorunludur." }, { status: 400 });
    }

    if (Number(quantity || 0) < 0) {
      return NextResponse.json({ error: "Stok miktarı negatif olamaz." }, { status: 400 });
    }

    const isSerialized = Boolean(requiresSerialNumber);
    const cleanImei = imei ? imei.trim() : null;

    if (isSerialized) {
      if (!cleanImei) {
        return NextResponse.json({ error: "Telefon kategorisi için IMEI zorunludur." }, { status: 400 });
      }
      if (Number(quantity || 0) > 1) {
        return NextResponse.json({ error: "Seri numaralı ürünler sadece 1 adet olarak eklenebilir." }, { status: 400 });
      }
      // IMEI uniqueness validation
      if (isDbDisabledMode()) {
        const store = await readLocalStore();
        const imeiExists = (store.stockItems || []).some(
          (x) => x.imei && x.imei.toLowerCase() === cleanImei.toLowerCase() && x.quantity > 0 && x.tenantId === tenantId
        );
        if (imeiExists) {
          return NextResponse.json({ error: `Bu IMEI numarası (${cleanImei}) zaten stokta mevcut.` }, { status: 400 });
        }
      } else {
        const existingStock = await prisma.stockItem.findFirst({
          where: { imei: { equals: cleanImei, mode: "insensitive" }, quantity: { gte: 1 }, tenantId },
        });
        if (existingStock) {
          return NextResponse.json({ error: `Bu IMEI numarası (${cleanImei}) zaten stokta mevcut (SKU: ${existingStock.sku}).` }, { status: 400 });
        }
      }
    }

    // Generate unique SKU for serialized items
    let stockItemSku = sku.trim();
    if (isSerialized && cleanImei) {
      stockItemSku = `${sku.trim()}-${cleanImei}`;
    }

    const formattedName = isSerialized && condition ? `${name.trim()} (${condition})` : name.trim();

    // Upsert: reuse an existing StockItem row with the same sku if one exists.
    // Covers restocking accessories AND buyback re-entry of a previously sold serial/IMEI
    // (that row still exists with quantity 0 — creating a new row would collide on the sku unique constraint).
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      const existingIdx = store.stockItems.findIndex((x) => x.sku.toLowerCase() === stockItemSku.toLowerCase() && x.tenantId === tenantId);
      if (existingIdx !== -1) {
        const item = store.stockItems[existingIdx];
        item.quantity += Number(quantity || 0);
        item.name = formattedName;
        item.condition = condition || null;
        item.serialNumber = serialNumber?.trim() || null;
        item.purchasePrice = Number(purchasePrice || 0);
        item.salePrice = Number(salePrice || 0);
        item.purchaseDocType = purchaseDocType || null;
        item.purchaseDocNo = purchaseDocNo || null;
        item.isCatalog = false;
        item.isBuybackItem = Boolean(item.isBuybackItem ?? false);
        item.buybackProcessStatus = item.buybackProcessStatus ?? null;
        item.buybackSaleEnabled = Boolean(item.buybackSaleEnabled ?? false);
        item.buybackDealId = item.buybackDealId ?? null;
        item.updatedAt = new Date().toISOString();

        // Sync to Product
        if (!store.productBranchStocks) store.productBranchStocks = [];
        const targetBranchId = store.branches?.[0]?.id;
        if (targetBranchId) {
          const pbsIdx = store.productBranchStocks.findIndex((x) => x.productId === item.id && x.branchId === targetBranchId);
          if (pbsIdx !== -1) {
            store.productBranchStocks[pbsIdx].stock = item.quantity;
          }
        }

        const logDetail = `Stok Miktarı Güncellendi (Upsert): ${item.sku} - ${item.name} (+${quantity} Adet, Yeni Toplam: ${item.quantity})`;
        store.stockLogs?.unshift({
          id: `stock-log-${Math.random().toString(36).substr(2, 9)}`,
          action: "STOCK_UPDATE",
          entityId: item.id,
          detail: logDetail,
          createdAt: new Date().toISOString(),
        });

        await writeLocalStore(store);
        return NextResponse.json(item, { status: 201 });
      }
    } else {
      const existingStock = await prisma.stockItem.findFirst({
        where: { sku: stockItemSku, tenantId },
      });
      if (existingStock) {
        const hasBuybackCols = await supportsStockItemBuybackColumns();
        const updated = await prisma.stockItem.update({
          where: { id: existingStock.id },
          data: {
            quantity: existingStock.quantity + Number(quantity || 0),
            name: formattedName,
            condition: condition || null,
            serialNumber: serialNumber?.trim() || null,
            purchasePrice: Number(purchasePrice || 0),
            salePrice: Number(salePrice || 0),
            purchaseDocType: purchaseDocType || null,
            purchaseDocNo: purchaseDocNo || null,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
            isCatalog: false,
            ...(hasBuybackCols
              ? {
                  isBuybackItem: isBuybackItem !== undefined ? Boolean(isBuybackItem) : undefined,
                  buybackProcessStatus: buybackProcessStatus !== undefined ? buybackProcessStatus : undefined,
                  buybackSaleEnabled: buybackSaleEnabled !== undefined ? Boolean(buybackSaleEnabled) : undefined,
                  buybackDealId: buybackDealId !== undefined ? (buybackDealId || null) : undefined,
                }
              : {}),
          },
        });

        const existingProduct = await prisma.product.findFirst({
          where: { barcode: stockItemSku, tenantId },
        });
        if (existingProduct) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: updated.name,
              condition: updated.condition,
              stock: updated.quantity,
              purchasePrice: updated.purchasePrice,
              salePrice: updated.salePrice,
            },
          });

          const defaultBranch = await prisma.branch.findFirst({
            where: { tenantId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          if (defaultBranch) {
            await prisma.productBranchStock.upsert({
              where: {
                productId_branchId: {
                  productId: existingProduct.id,
                  branchId: defaultBranch.id,
                },
              },
              create: {
                productId: existingProduct.id,
                branchId: defaultBranch.id,
                stock: updated.quantity,
              },
              update: {
                stock: updated.quantity,
              },
            });
          }
        }

        await writeAuditLog({
          action: "STOCK_UPDATE",
          entityType: "StockItem",
          entityId: updated.id,
          detail: `Stok Miktarı Güncellendi (Upsert): ${updated.sku} - ${updated.name} (+${quantity} Adet, Yeni Toplam: ${updated.quantity})`,
          actorUserId: auth.user?.userId,
        });

        return NextResponse.json(updated, { status: 201 });
      }
    }

    // Standard Create StockItem Flow (Serialized or New Accessory SKU)
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.stockLogs) store.stockLogs = [];

      const exists = store.stockItems.some((x) => x.sku.toLowerCase() === stockItemSku.toLowerCase() && !x.isCatalog && x.tenantId === tenantId);
      if (exists) {
        return NextResponse.json({ error: "Bu SKU zaten kayıtlı." }, { status: 409 });
      }

      const newItem = {
        id: `stock-item-${Math.random().toString(36).substr(2, 9)}`,
        sku: stockItemSku,
        name: formattedName,
        category: category || "Genel",
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        variantColor: variantColor?.trim() || null,
        variantStorage: variantStorage?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        imei: cleanImei,
        quantity: Number(quantity || 0),
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        purchaseDocType: purchaseDocType?.trim() || null,
        purchaseDocNo: purchaseDocNo?.trim() || null,
        minThreshold: Number(minThreshold || 0),
        isCatalog: false,
        condition: condition || null,
        isBuybackItem: Boolean(isBuybackItem ?? false),
        buybackProcessStatus: buybackProcessStatus || null,
        buybackSaleEnabled: Boolean(buybackSaleEnabled ?? false),
        buybackDealId: buybackDealId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId,
      };

      store.stockItems.push(newItem);
      if (!store.productBranchStocks) store.productBranchStocks = [];
      const targetBranchId = store.branches?.[0]?.id;
      if (targetBranchId) {
        store.productBranchStocks.push({
          id: `pbs-${Math.random().toString(36).substr(2, 9)}`,
          productId: newItem.id,
          branchId: targetBranchId,
          stock: newItem.quantity,
        });
      }
      
      const logDetail = `Yeni Envanter Girişi: ${stockItemSku} - ${formattedName} (Adet: ${quantity})`;
      store.stockLogs.unshift({
        id: `stock-log-${Math.random().toString(36).substr(2, 9)}`,
        action: "STOCK_ADD",
        entityId: newItem.id,
        detail: logDetail,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return NextResponse.json(newItem, { status: 201 });
    }

    const hasBuybackCols = await supportsStockItemBuybackColumns();
    if (!hasBuybackCols) {
      // DB schema is behind Prisma model. Fallback to Product-based inventory so demo can proceed safely.
      const defaultBranch = await prisma.branch.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      const existingProduct = await prisma.product.findFirst({
        where: { barcode: stockItemSku, tenantId },
      });
      const nextQty = Number(quantity || 0);
      const upsertedProduct = existingProduct
        ? await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: formattedName,
              category: category || "Genel",
              brand: brand?.trim() || null,
              model: model?.trim() || null,
              variantColor: variantColor?.trim() || null,
              variantStorage: variantStorage?.trim() || null,
              serialNumber: serialNumber?.trim() || null,
              imei: cleanImei,
              stock: existingProduct.stock + nextQty,
              purchasePrice: Number(purchasePrice || 0),
              salePrice: Number(salePrice || 0),
              purchaseDocType: purchaseDocType?.trim() || null,
              purchaseDocNo: purchaseDocNo?.trim() || null,
              isCatalog: false,
              condition: condition || null,
              purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
            },
          })
        : await prisma.product.create({
            data: {
              name: formattedName,
              barcode: stockItemSku,
              category: category || "Genel",
              brand: brand?.trim() || null,
              model: model?.trim() || null,
              variantColor: variantColor?.trim() || null,
              variantStorage: variantStorage?.trim() || null,
              serialNumber: serialNumber?.trim() || null,
              imei: cleanImei,
              stock: nextQty,
              purchasePrice: Number(purchasePrice || 0),
              salePrice: Number(salePrice || 0),
              purchaseDocType: purchaseDocType?.trim() || null,
              purchaseDocNo: purchaseDocNo?.trim() || null,
              isCatalog: false,
              condition: condition || null,
              purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
              tenantId,
            },
          });

      if (defaultBranch) {
        await prisma.productBranchStock.upsert({
          where: {
            productId_branchId: {
              productId: upsertedProduct.id,
              branchId: defaultBranch.id,
            },
          },
          create: {
            productId: upsertedProduct.id,
            branchId: defaultBranch.id,
            stock: upsertedProduct.stock,
          },
          update: {
            stock: upsertedProduct.stock,
          },
        });
      }

      return NextResponse.json(
        {
          id: `legacy-product-${upsertedProduct.id}`,
          sku: upsertedProduct.barcode,
          name: upsertedProduct.name,
          category: upsertedProduct.category || "Genel",
          quantity: upsertedProduct.stock,
          purchasePrice: upsertedProduct.purchasePrice,
          salePrice: upsertedProduct.salePrice,
          isCatalog: false,
          tenantId: upsertedProduct.tenantId,
        },
        { status: 201 },
      );
    }

    const item = await prisma.stockItem.create({
      data: {
        sku: stockItemSku,
        name: formattedName,
        category: category || "Genel",
        quantity: Number(quantity || 0),
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        variantColor: variantColor?.trim() || null,
        variantStorage: variantStorage?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        imei: cleanImei,
        purchaseDocType: purchaseDocType?.trim() || null,
        purchaseDocNo: purchaseDocNo?.trim() || null,
        minThreshold: Number(minThreshold || 0),
        isCatalog: false,
        condition: condition || null,
        ...(hasBuybackCols
          ? {
              isBuybackItem: Boolean(isBuybackItem ?? false),
              buybackProcessStatus: buybackProcessStatus || null,
              buybackSaleEnabled: Boolean(buybackSaleEnabled ?? false),
              buybackDealId: buybackDealId || null,
            }
          : {}),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
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
        isCatalog: false,
        condition: item.condition,
        purchaseDate: item.purchaseDate,
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
        isCatalog: false,
        condition: item.condition,
        purchaseDate: item.purchaseDate,
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
      detail: `Yeni Envanter Girişi: ${item.sku} - ${item.name} (Adet: ${item.quantity})`,
      actorUserId: auth.user?.userId,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding stock item:", error);
    return NextResponse.json({ error: "Kayıt işlemi başarısız." }, { status: 500 });
  }
}


