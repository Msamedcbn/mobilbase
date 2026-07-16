import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

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

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toUpperCase()
    .replace(/Ä/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Å/g, "S")
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const { searchParams } = new URL(req.url);
  const catalog = searchParams.get("catalog") === "true";

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const stockItemsAsProducts = (store.stockItems || [])
      .filter((item) => (catalog ? item.isCatalog === true : !item.isCatalog) && item.tenantId === tenantId)
      .map((item) => ({
        id: item.id,
        name: item.name,
        barcode: item.sku,
        category: item.category,
        brand: item.brand || null,
        model: item.model || null,
        variantColor: item.variantColor || null,
        variantStorage: item.variantStorage || null,
        serialNumber: item.serialNumber || null,
        imei: item.imei || null,
        stock: item.quantity,
        purchasePrice: Number(item.purchasePrice).toFixed(2),
        salePrice: Number(item.salePrice).toFixed(2),
        dealerPrice: item.dealerPrice != null ? Number(item.dealerPrice).toFixed(2) : null,
        wholesalePrice: item.wholesalePrice != null ? Number(item.wholesalePrice).toFixed(2) : null,
        images: item.images || [],
        isCatalog: item.isCatalog || false,
        condition: item.condition || null,
        purchaseDate: item.purchaseDate || item.createdAt || new Date().toISOString(),
        branchStocks: (store.productBranchStocks || [])
          .filter((s) => s.productId === item.id)
          .map((s) => ({
            ...s,
            branch: store.branches?.find((b) => b.id === s.branchId) || null,
          })),
      }));

    return ok(stockItemsAsProducts);
  }

  try {
    const products = await prisma.product.findMany({
      where: { tenantId, isCatalog: catalog, isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { branchStocks: { include: { branch: true } } },
    });
    return ok(products);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const catalog = searchParams.get("catalog") === "true" || body.isCatalog === true;

    let {
      barcode,
      sku,
      name,
      category,
      brand,
      model,
      variantColor,
      variantStorage,
      purchasePrice,
      salePrice,
      stock,
      imei,
      condition,
      serialNumber,
      requiresSerialNumber,
    } = body;
    const requiresSerial = Boolean(requiresSerialNumber);

    const code = barcode || sku;
    let generatedBarcode = code;

    if (!generatedBarcode) {
      const catClean = cleanString(category || "");
      const brandClean = cleanString(brand || "");
      const modelClean = cleanString(model || "");
      const storageClean = cleanString(variantStorage || "");
      const colorClean = cleanString(variantColor || "");
      const nameClean = cleanString(name || "");

      if (catClean === "TELEFON") {
        generatedBarcode = `TEL-${brandClean}-${modelClean}-${storageClean}-${colorClean}`.replace(/-+/g, "-");
      } else if (catClean === "AKSESUAR") {
        generatedBarcode = `AKS-${brandClean || "GENEL"}-${nameClean || "AKSESUAR"}`.replace(/-+/g, "-");
      } else if (catClean === "YEDEKPARCA") {
        generatedBarcode = `PAR-${brandClean || "GENEL"}-${nameClean || "PARCA"}`.replace(/-+/g, "-");
      } else {
        generatedBarcode = `PRD-${nameClean || "URUN"}`.replace(/-+/g, "-");
      }
      
      generatedBarcode = generatedBarcode.replace(/-+$/, "").replace(/^-+/, "");

      // Ensure uniqueness: if it exists, append a random suffix
      if (isDbDisabledMode()) {
        const store = await readLocalStore();
        let suffix = 1;
        let candidate = generatedBarcode;
        while (store.stockItems?.some((x) => x.sku === candidate && x.tenantId === tenantId)) {
          candidate = `${generatedBarcode}-${suffix}`;
          suffix++;
        }
        generatedBarcode = candidate;
      } else {
        let suffix = 1;
        let candidate = generatedBarcode;
        while (true) {
          const exists = await prisma.product.findFirst({
            where: { barcode: candidate, tenantId },
          });
          if (!exists) break;
          candidate = `${generatedBarcode}-${suffix}`;
          suffix++;
        }
        generatedBarcode = candidate;
      }
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      const exists = store.stockItems.some((x) => x.sku.toLowerCase() === generatedBarcode.toLowerCase() && x.tenantId === tenantId);
      if (exists) {
        return fail("Bu SKU zaten kayitli.", "VALIDATION", 400);
      }

      const initialQty = Number(stock || 0);
      if (requiresSerial && initialQty > 0) {
        const trimmedImei = imei ? String(imei).trim() : "";
        if (!trimmedImei) {
          return fail("Stok eklemek icin IMEI numarasi zorunludur.", "VALIDATION", 400);
        }
        if (trimmedImei.length < 14 || trimmedImei.length > 16) {
          return fail("Gecerli bir IMEI numarasi girin (14-16 haneli).", "VALIDATION", 400);
        }
        if (initialQty > 1) {
          return fail("Seri numarali cihazlar icin baslangic stogu en fazla 1 olabilir.", "VALIDATION", 400);
        }
      }

      const newCatalogItem = {
        id: `stock-item-${Math.random().toString(36).substr(2, 9)}`,
        sku: generatedBarcode,
        name: name || `${brand || ""} ${model || ""} ${variantStorage || ""} ${variantColor || ""}`.trim(),
        category: category || "Genel",
        brand: brand || null,
        model: model || null,
        variantColor: variantColor || null,
        variantStorage: variantStorage || null,
        serialNumber: null,
        imei: null,
        quantity: 0,
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        purchaseDocType: null,
        purchaseDocNo: null,
        minThreshold: 0,
        isCatalog: true,
        requiresSerialNumber: requiresSerial,
        condition: null,
        purchaseDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tenantId,
      };
      store.stockItems.push(newCatalogItem);

      const qty = Number(stock || 0);
      if (qty > 0) {
        const cleanImei = imei ? imei.trim() : null;
        let stockItemSku = generatedBarcode;
        if (cleanImei) {
          stockItemSku = `${generatedBarcode}-${cleanImei}`;
        }
        const formattedName = cleanImei && condition ? `${newCatalogItem.name} (${condition})` : newCatalogItem.name;

        const physicalItem = {
          id: `stock-item-${Math.random().toString(36).substr(2, 9)}`,
          sku: stockItemSku,
          name: formattedName,
          category: newCatalogItem.category,
          brand: newCatalogItem.brand,
          model: newCatalogItem.model,
          variantColor: newCatalogItem.variantColor,
          variantStorage: newCatalogItem.variantStorage,
          serialNumber: serialNumber || null,
          imei: cleanImei,
          quantity: qty,
          purchasePrice: Number(purchasePrice || 0),
          salePrice: Number(salePrice || 0),
          purchaseDocType: null,
          purchaseDocNo: null,
          minThreshold: 0,
          isCatalog: false,
          condition: condition || null,
          purchaseDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenantId,
        };
        store.stockItems.push(physicalItem);

        if (!store.productBranchStocks) store.productBranchStocks = [];
        const targetBranchId = store.branches?.[0]?.id;
        if (targetBranchId) {
          store.productBranchStocks.push({
            id: `pbs-${Math.random().toString(36).substr(2, 9)}`,
            productId: physicalItem.id,
            branchId: targetBranchId,
            stock: physicalItem.quantity,
          });
        }
      }

      await writeLocalStore(store);
      return ok(newCatalogItem, 201, "Ürün kaydi basarili");
    }

    const initialQty = Number(stock || 0);
    if (requiresSerial && initialQty > 0) {
      const trimmedImei = imei ? String(imei).trim() : "";
      if (!trimmedImei) {
        return fail("Stok eklemek icin IMEI numarasi zorunludur.", "VALIDATION", 400);
      }
      if (trimmedImei.length < 14 || trimmedImei.length > 16) {
        return fail("Gecerli bir IMEI numarasi girin (14-16 haneli).", "VALIDATION", 400);
      }
      if (initialQty > 1) {
        return fail("Seri numarali cihazlar icin baslangic stogu en fazla 1 olabilir.", "VALIDATION", 400);
      }
    }

    const product = await prisma.product.create({
      data: {
        name: name || `${brand || ""} ${model || ""} ${variantStorage || ""} ${variantColor || ""}`.trim(),
        barcode: generatedBarcode,
        category: category || "Genel",
        brand: brand || null,
        model: model || null,
        variantColor: variantColor || null,
        variantStorage: variantStorage || null,
        purchasePrice: Number(purchasePrice || 0),
        salePrice: Number(salePrice || 0),
        isCatalog: catalog,
        requiresSerialNumber: requiresSerial,
        tenantId,
      },
    });

    const hasBuybackCols = await supportsStockItemBuybackColumns();
    if (hasBuybackCols) {
      await prisma.stockItem.create({
        data: {
          sku: generatedBarcode,
          name: product.name,
          category: product.category || "Genel",
          brand: product.brand,
          model: product.model,
          variantColor: product.variantColor,
          variantStorage: product.variantStorage,
          purchasePrice: Number(purchasePrice || 0),
          salePrice: product.salePrice,
          isCatalog: true,
          quantity: 0,
          tenantId,
        }
      });
    }

    const qty = Number(stock || 0);
    if (qty > 0) {
      const cleanImei = imei ? imei.trim() : null;
      let stockItemSku = generatedBarcode;
      if (cleanImei) {
        stockItemSku = `${generatedBarcode}-${cleanImei}`;
      }
      const formattedName = cleanImei && condition ? `${product.name} (${condition})` : product.name;

      const defaultBranch = await prisma.branch.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const createdProduct = hasBuybackCols
        ? await (async () => {
            const item = await prisma.stockItem.create({
              data: {
                sku: stockItemSku,
                name: formattedName,
                category: product.category || "Genel",
                quantity: qty,
                purchasePrice: Number(purchasePrice || 0),
                salePrice: Number(salePrice || 0),
                brand: product.brand,
                model: product.model,
                variantColor: product.variantColor,
                variantStorage: product.variantStorage,
                serialNumber: serialNumber || null,
                imei: cleanImei,
                isCatalog: false,
                condition: condition || null,
                tenantId,
              }
            });
            return prisma.product.create({
              data: {
                name: item.name,
                barcode: item.sku,
                category: item.category,
                brand: item.brand,
                model: item.model,
                variantColor: item.variantColor,
                variantStorage: item.variantStorage,
                stock: item.quantity,
                purchasePrice: item.purchasePrice,
                salePrice: item.salePrice,
                serialNumber: item.serialNumber,
                imei: item.imei,
                isCatalog: false,
                condition: item.condition,
                tenantId,
              },
            });
          })()
        : await prisma.product.create({
            data: {
              name: formattedName,
              barcode: stockItemSku,
              category: product.category || "Genel",
              brand: product.brand,
              model: product.model,
              variantColor: product.variantColor,
              variantStorage: product.variantStorage,
              stock: qty,
              purchasePrice: Number(purchasePrice || 0),
              salePrice: Number(salePrice || 0),
              serialNumber: serialNumber || null,
              imei: cleanImei,
              isCatalog: false,
              condition: condition || null,
              tenantId,
            },
          });

      if (defaultBranch) {
        await prisma.productBranchStock.create({
          data: {
            productId: createdProduct.id,
            branchId: defaultBranch.id,
            stock: createdProduct.stock,
          }
        });
      }
    }

    return ok(product, 201, "Ürün kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

