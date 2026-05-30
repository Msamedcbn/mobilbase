import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

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

const defaultCatalogItems = [
  {
    category: "Telefon",
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    variantStorage: "256GB",
    variantColor: "Doğal Titanyum",
    name: "Apple iPhone 15 Pro Max 256GB Doğal Titanyum",
    sku: "TEL-APPLE-IPHONE-15-PRO-MAX-256GB-DOGAL-TITANYUM",
    purchasePrice: 62000,
    salePrice: 75000,
  },
  {
    category: "Telefon",
    brand: "Apple",
    model: "iPhone 15 Pro",
    variantStorage: "128GB",
    variantColor: "Siyah Titanyum",
    name: "Apple iPhone 15 Pro 128GB Siyah Titanyum",
    sku: "TEL-APPLE-IPHONE-15-PRO-128GB-SIYAH-TITANYUM",
    purchasePrice: 54000,
    salePrice: 65000,
  },
  {
    category: "Telefon",
    brand: "Apple",
    model: "iPhone 15",
    variantStorage: "128GB",
    variantColor: "Mavi",
    name: "Apple iPhone 15 128GB Mavi",
    sku: "TEL-APPLE-IPHONE-15-128GB-MAVI",
    purchasePrice: 42000,
    salePrice: 50000,
  },
  {
    category: "Telefon",
    brand: "Apple",
    model: "iPhone 14",
    variantStorage: "128GB",
    variantColor: "Gece Yarısı",
    name: "Apple iPhone 14 128GB Gece Yarısı",
    sku: "TEL-APPLE-IPHONE-14-128GB-GECE-YARISI",
    purchasePrice: 35000,
    salePrice: 43000,
  },
  {
    category: "Telefon",
    brand: "Apple",
    model: "iPhone 13",
    variantStorage: "128GB",
    variantColor: "Yıldız Işığı",
    name: "Apple iPhone 13 128GB Yıldız Işığı",
    sku: "TEL-APPLE-IPHONE-13-128GB-YILDIZ-ISIGI",
    purchasePrice: 30000,
    salePrice: 37000,
  },
  {
    category: "Telefon",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    variantStorage: "256GB",
    variantColor: "Titanyum Siyah",
    name: "Samsung Galaxy S24 Ultra 256GB Titanyum Siyah",
    sku: "TEL-SAMSUNG-GALAXY-S24-ULTRA-256GB-TITANYUM-SIYAH",
    purchasePrice: 58000,
    salePrice: 70000,
  },
  {
    category: "Telefon",
    brand: "Samsung",
    model: "Galaxy S24+",
    variantStorage: "256GB",
    variantColor: "Mermer Grisi",
    name: "Samsung Galaxy S24+ 256GB Mermer Grisi",
    sku: "TEL-SAMSUNG-GALAXY-S24-256GB-MERMER-GRISI",
    purchasePrice: 40000,
    salePrice: 48000,
  },
  {
    category: "Telefon",
    brand: "Samsung",
    model: "Galaxy S24",
    variantStorage: "128GB",
    variantColor: "Kehribar Sarısı",
    name: "Samsung Galaxy S24 128GB Kehribar Sarısı",
    sku: "TEL-SAMSUNG-GALAXY-S24-128GB-KEHRIBAR-SARISI",
    purchasePrice: 30000,
    salePrice: 37000,
  },
  {
    category: "Telefon",
    brand: "Samsung",
    model: "Galaxy A55 5G",
    variantStorage: "128GB",
    variantColor: "Mavi",
    name: "Samsung Galaxy A55 5G 128GB Mavi",
    sku: "TEL-SAMSUNG-GALAXY-A55-5G-128GB-MAVI",
    purchasePrice: 16000,
    salePrice: 20000,
  },
  {
    category: "Telefon",
    brand: "Samsung",
    model: "Galaxy A35 5G",
    variantStorage: "128GB",
    variantColor: "Karanlık Lacivert",
    name: "Samsung Galaxy A35 5G 128GB Karanlık Lacivert",
    sku: "TEL-SAMSUNG-GALAXY-A35-5G-128GB-KARANLIK-LACIVERT",
    purchasePrice: 12000,
    salePrice: 15500,
  },
  {
    category: "Aksesuar",
    brand: "Apple",
    model: "",
    variantStorage: "",
    variantColor: "",
    name: "Apple 20W USB-C Güç Adaptörü",
    sku: "AKS-APPLE-20W-USB-C-ADAPTOR",
    purchasePrice: 450,
    salePrice: 850,
  },
  {
    category: "Aksesuar",
    brand: "Apple",
    model: "",
    variantStorage: "",
    variantColor: "",
    name: "Apple Lightning to USB Kablosu (1m)",
    sku: "AKS-APPLE-LIGHTNING-KABLO-1M",
    purchasePrice: 350,
    salePrice: 700,
  },
  {
    category: "Aksesuar",
    brand: "Samsung",
    model: "",
    variantStorage: "",
    variantColor: "",
    name: "Samsung 25W USB-C Hızlı Şarj Adaptörü",
    sku: "AKS-SAMSUNG-25W-USB-C-ADAPTOR",
    purchasePrice: 380,
    salePrice: 650,
  },
  {
    category: "Aksesuar",
    brand: "Genel",
    model: "",
    variantStorage: "",
    variantColor: "",
    name: "iPhone 15 Pro Max Uyumlu Şeffaf Silikon Kılıf",
    sku: "AKS-GENEL-IP15PM-SEFFAF-KILIF",
    purchasePrice: 80,
    salePrice: 250,
  },
  {
    category: "Aksesuar",
    brand: "Genel",
    model: "",
    variantStorage: "",
    variantColor: "",
    name: "iPhone 13 Uyumlu 9D Temperli Ekran Koruyucu Cam",
    sku: "AKS-GENEL-IP13-TEMPERLI-CAM",
    purchasePrice: 30,
    salePrice: 150,
  },
  {
    category: "Yedek Parça",
    brand: "Apple",
    model: "iPhone 11",
    variantStorage: "",
    variantColor: "",
    name: "iPhone 11 Orijinal Ekran Revize Modülü",
    sku: "PAR-APPLE-IP11-ORIJINAL-EKRAN",
    purchasePrice: 1200,
    salePrice: 2200,
  },
  {
    category: "Yedek Parça",
    brand: "Apple",
    model: "iPhone 12",
    variantStorage: "",
    variantColor: "",
    name: "iPhone 12 Deji Yüksek Kapasiteli Batarya",
    sku: "PAR-APPLE-IP12-DEJI-BATARYA",
    purchasePrice: 450,
    salePrice: 950,
  },
  {
    category: "Yedek Parça",
    brand: "Samsung",
    model: "Galaxy S22",
    variantStorage: "",
    variantColor: "",
    name: "Samsung Galaxy S22 Orijinal Ekran Modülü",
    sku: "PAR-SAMSUNG-S22-ORIJINAL-EKRAN",
    purchasePrice: 2800,
    salePrice: 4200,
  },
  {
    category: "Yedek Parça",
    brand: "Apple",
    model: "iPhone 13 Pro",
    variantStorage: "",
    variantColor: "",
    name: "iPhone 13 Pro Şarj Soket Filmi Orijinal",
    sku: "PAR-APPLE-IP13PRO-SARJ-SOKETI",
    purchasePrice: 400,
    salePrice: 900,
  },
  {
    category: "Yedek Parça",
    brand: "Samsung",
    model: "Galaxy A52",
    variantStorage: "",
    variantColor: "",
    name: "Samsung Galaxy A52 Orijinal Batarya",
    sku: "PAR-SAMSUNG-A52-BATARYA",
    purchasePrice: 350,
    salePrice: 750,
  },
];

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.stockItems) store.stockItems = [];
      if (!store.productBranchStocks) store.productBranchStocks = [];
      const targetBranchId = store.branches?.[0]?.id || "branch-kadikoy";

      let addedCount = 0;
      let phoneIndex = 1;

      for (const item of defaultCatalogItems) {
        // 1. Check duplicate for catalog template
        const existsCatalog = store.stockItems.some(
          (x) => x.sku.toLowerCase() === item.sku.toLowerCase() && x.isCatalog === true && x.tenantId === tenantId
        );
        if (!existsCatalog) {
          // Create catalog card template
          store.stockItems.push({
            id: `stock-item-${Math.random().toString(36).substr(2, 9)}`,
            sku: item.sku,
            name: item.name,
            category: item.category,
            brand: item.brand || null,
            model: item.model || null,
            variantColor: item.variantColor || null,
            variantStorage: item.variantStorage || null,
            serialNumber: null,
            imei: null,
            quantity: 0,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            purchaseDocType: null,
            purchaseDocNo: null,
            minThreshold: 0,
            isCatalog: true,
            condition: null,
            purchaseDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId,
          });
          addedCount++;
        }

        // 2. Check and create physical stock item with initial quantity so it shows in POS and Inventory
        const cleanImei = item.category === "Telefon" ? `358901123456${String(phoneIndex).padStart(3, "0")}` : null;
        const condition = item.category === "Telefon" ? "1. Sıfır" : null;
        const qty = item.category === "Telefon" ? 1 : 5;
        
        let physicalSku = item.sku;
        if (cleanImei) {
          physicalSku = `${item.sku}-${cleanImei}`;
        }

        const existsPhysicalIdx = store.stockItems.findIndex(
          (x) => x.sku.toLowerCase() === physicalSku.toLowerCase() && x.isCatalog === false && x.tenantId === tenantId
        );

        let physicalItem;
        if (existsPhysicalIdx === -1) {
          const formattedName = cleanImei ? `${item.name} (${condition})` : item.name;
          physicalItem = {
            id: `stock-item-${Math.random().toString(36).substr(2, 9)}`,
            sku: physicalSku,
            name: formattedName,
            category: item.category,
            brand: item.brand || null,
            model: item.model || null,
            variantColor: item.variantColor || null,
            variantStorage: item.variantStorage || null,
            serialNumber: null,
            imei: cleanImei,
            quantity: qty,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            purchaseDocType: "INVOICE",
            purchaseDocNo: "SEED-DOC-01",
            minThreshold: 0,
            isCatalog: false,
            condition: condition,
            purchaseDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId,
          };
          store.stockItems.push(physicalItem);
          addedCount++;
        } else {
          physicalItem = store.stockItems[existsPhysicalIdx];
        }

        // Map to branch stock if missing
        const existsBranchStock = store.productBranchStocks.some(
          (x) => x.productId === physicalItem.id && x.branchId === targetBranchId
        );
        if (!existsBranchStock) {
          store.productBranchStocks.push({
            id: `pbs-${Math.random().toString(36).substr(2, 9)}`,
            productId: physicalItem.id,
            branchId: targetBranchId,
            stock: physicalItem.quantity,
          });
        }

        phoneIndex++;
      }

      await writeLocalStore(store);
      return ok({ addedCount }, 201, "Seed işlemi başarılı.");
    }

    // Database mode
    const defaultBranch = await prisma.branch.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    let addedCount = 0;
    let phoneIndex = 1;

    const hasBuybackCols = await supportsStockItemBuybackColumns();
    for (const item of defaultCatalogItems) {
      // 1. Check and create catalog product (template)
      const existsCatalog = await prisma.product.findFirst({
        where: { barcode: item.sku, isCatalog: true, tenantId },
      });
      
      let catalogProduct = existsCatalog;
      if (!existsCatalog) {
        catalogProduct = await prisma.product.create({
          data: {
            name: item.name,
            barcode: item.sku,
            category: item.category,
            brand: item.brand || null,
            model: item.model || null,
            variantColor: item.variantColor || null,
            variantStorage: item.variantStorage || null,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            isCatalog: true,
            tenantId,
          },
        });

        if (hasBuybackCols) {
          await prisma.stockItem.create({
            data: {
              sku: item.sku,
              name: catalogProduct.name,
              category: catalogProduct.category || "Genel",
              brand: catalogProduct.brand,
              model: catalogProduct.model,
              variantColor: catalogProduct.variantColor,
              variantStorage: catalogProduct.variantStorage,
              purchasePrice: item.purchasePrice,
              salePrice: catalogProduct.salePrice,
              isCatalog: true,
              quantity: 0,
              tenantId,
            },
          });
        }
        addedCount++;
      }

      // 2. Check and create physical stock item
      const cleanImei = item.category === "Telefon" ? `358901123456${String(phoneIndex).padStart(3, "0")}` : null;
      const condition = item.category === "Telefon" ? "1. Sıfır" : null;
      const qty = item.category === "Telefon" ? 1 : 5;

      let physicalSku = item.sku;
      if (cleanImei) {
        physicalSku = `${item.sku}-${cleanImei}`;
      }

      const existsPhysical = await prisma.product.findFirst({
        where: { barcode: physicalSku, isCatalog: false, tenantId },
      });

      let physicalProductRecord = existsPhysical;

      if (!existsPhysical) {
        const formattedName = cleanImei ? `${item.name} (${condition})` : item.name;
        if (hasBuybackCols) {
          const physicalStockItem = await prisma.stockItem.create({
            data: {
              sku: physicalSku,
              name: formattedName,
              category: item.category,
              quantity: qty,
              purchasePrice: item.purchasePrice,
              salePrice: item.salePrice,
              brand: item.brand || null,
              model: item.model || null,
              variantColor: item.variantColor || null,
              variantStorage: item.variantStorage || null,
              imei: cleanImei,
              isCatalog: false,
              condition: condition,
              purchaseDocType: "INVOICE",
              purchaseDocNo: "SEED-DOC-01",
              tenantId,
            },
          });
          physicalProductRecord = await prisma.product.create({
            data: {
              name: physicalStockItem.name,
              barcode: physicalStockItem.sku,
              category: physicalStockItem.category,
              brand: physicalStockItem.brand,
              model: physicalStockItem.model,
              variantColor: physicalStockItem.variantColor,
              variantStorage: physicalStockItem.variantStorage,
              stock: physicalStockItem.quantity,
              purchasePrice: physicalStockItem.purchasePrice,
              salePrice: physicalStockItem.salePrice,
              imei: physicalStockItem.imei,
              isCatalog: false,
              condition: physicalStockItem.condition,
              tenantId,
            },
          });
        } else {
          physicalProductRecord = await prisma.product.create({
            data: {
              name: formattedName,
              barcode: physicalSku,
              category: item.category,
              brand: item.brand || null,
              model: item.model || null,
              variantColor: item.variantColor || null,
              variantStorage: item.variantStorage || null,
              stock: qty,
              purchasePrice: item.purchasePrice,
              salePrice: item.salePrice,
              imei: cleanImei,
              isCatalog: false,
              condition: condition,
              tenantId,
            },
          });
        }
        addedCount++;
      }

      // Ensure ProductBranchStock mapping exists for defaultBranch
      if (defaultBranch && physicalProductRecord) {
        const existsBranchStock = await prisma.productBranchStock.findUnique({
          where: {
            productId_branchId: {
              productId: physicalProductRecord.id,
              branchId: defaultBranch.id,
            },
          },
        });

        if (!existsBranchStock) {
          const defaultQty = item.category === "Telefon" ? 1 : 5;
          await prisma.productBranchStock.create({
            data: {
              productId: physicalProductRecord.id,
              branchId: defaultBranch.id,
              stock: defaultQty,
            },
          });
        }
      }

      phoneIndex++;
    }

    return ok({ addedCount }, 201, "Seed işlemi başarılı.");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
