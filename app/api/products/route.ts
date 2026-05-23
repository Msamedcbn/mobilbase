import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
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
  try {
    const body = await req.json();
    const product = await prisma.product.create({ data: body });
    return ok(product, 201, "Urun kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
