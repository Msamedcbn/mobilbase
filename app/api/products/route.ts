import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const stockItemsAsProducts = (store.stockItems || []).map((item) => ({
      id: item.id,
      name: item.name,
      barcode: item.sku,
      category: item.category,
      stock: item.quantity,
      purchasePrice: Number(item.purchasePrice).toFixed(2),
      salePrice: Number(item.salePrice).toFixed(2),
      branchStocks: (store.productBranchStocks || [])
        .filter((s) => s.productId === item.id)
        .map((s) => ({
          ...s,
          branch: store.branches?.find((b) => b.id === s.branchId) || null,
        })),
    }));

    if (stockItemsAsProducts.length > 0) {
      return ok(stockItemsAsProducts);
    }

    return ok([
      {
        id: "demo-prod-1",
        name: "Type-C Hizli Sarj Adaptoru",
        barcode: "869000000001",
        category: "Aksesuar",
        stock: 20,
        purchasePrice: "800.00",
        salePrice: "1299.00",
        branchStocks: (store.productBranchStocks || [])
          .filter((s) => s.productId === "demo-prod-1")
          .map((s) => ({
            ...s,
            branch: store.branches?.find((b) => b.id === s.branchId) || null,
          })),
      },
      {
        id: "demo-prod-2",
        name: "Temperli Cam",
        barcode: "869000000002",
        category: "Aksesuar",
        stock: 30,
        purchasePrice: "150.00",
        salePrice: "499.00",
        branchStocks: (store.productBranchStocks || [])
          .filter((s) => s.productId === "demo-prod-2")
          .map((s) => ({
            ...s,
            branch: store.branches?.find((b) => b.id === s.branchId) || null,
          })),
      },
    ]);
  }

  try {
    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      include: { branchStocks: { include: { branch: true } } },
    });
    return ok(products);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  try {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        ...body,
        tenantId,
      },
    });
    return ok(product, 201, "Urun kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
