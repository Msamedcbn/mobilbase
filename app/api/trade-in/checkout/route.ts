import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { tradeInCheckoutSchema } from "@/lib/validations";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";

const demoProducts = [
  { id: "demo-prod-1", name: "Type-C Hizli Sarj Adaptoru", salePrice: 1299 },
  { id: "demo-prod-2", name: "Temperli Cam", salePrice: 499 },
];

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = tradeInCheckoutSchema.safeParse(body);
    if (!parsed.success) return fail("Takas checkout verisi geçersiz", "VALIDATION", 400);

    const { buybackCredit, productId, quantity, paymentMethod, customerId, branchId, note } = parsed.data;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const product = demoProducts.find((p) => p.id === productId);
      if (!product) return fail("Ürün bulunamadı", "NOT_FOUND", 404);

      const activeBranchId = branchId || "branch-kadikoy";
      if (!store.productBranchStocks) store.productBranchStocks = [];
      const branchStock = store.productBranchStocks.find((s) => s.productId === productId && s.branchId === activeBranchId);
      const currentStock = branchStock?.stock ?? 0;
      if (currentStock < quantity) return fail(`Şube stogu yetersiz (Mevcut: ${currentStock})`, "STOCK", 409);
      if (branchStock) branchStock.stock -= quantity;

      const grossAmount = product.salePrice * quantity;
      const differenceAmount = Math.max(0, grossAmount - buybackCredit);
      const transactionNo = `TRD-DEMO-${Date.now()}`;

      store.transactions = store.transactions || [];
      store.transactions.unshift({
        id: localId("tr"),
        transactionNo,
        type: "INCOME",
        paymentMethod,
        customerId: customerId ?? null,
        totalAmount: differenceAmount,
        note: note || `Takas işlemi / Ürün:${product.name} / Kredi:${buybackCredit}`,
        createdAt: new Date().toISOString(),
        branchId: activeBranchId,
      });

      if (paymentMethod === "ON_ACCOUNT" && customerId && differenceAmount > 0) {
        store.accountEntries = store.accountEntries || [];
        store.accountEntries.push({
          id: localId("entry"),
          customerId,
          type: "DEBIT",
          amount: differenceAmount,
          description: `${transactionNo} no'lu takas fark borcu`,
          createdAt: new Date().toISOString(),
        });
      }

      await writeLocalStore(store);
      return ok({
        transactionNo,
        productName: product.name,
        quantity,
        grossAmount,
        buybackCredit,
        differenceAmount,
      }, 201, "Takas işlemi tamamlandi");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return fail("Ürün bulunamadı", "NOT_FOUND", 404);
    if (product.stock < quantity) return fail("Stok yetersiz", "STOCK", 409);

    const grossAmount = Number(product.salePrice) * quantity;
    const differenceAmount = Math.max(0, grossAmount - buybackCredit);

    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
      return tx.transaction.create({
        data: {
          transactionNo: `TRD-${Date.now()}`,
          type: "INCOME",
          paymentMethod,
          customerId: customerId ?? null,
          totalAmount: differenceAmount,
          branchId: branchId ?? null,
          note: note || `Takas işlemi / Ürün:${product.name} / Kredi:${buybackCredit}`,
          items: {
            create: [
              {
                productId,
                quantity,
                unitPrice: Number(product.salePrice),
                lineTotal: grossAmount,
              },
            ],
          },
        },
      });
    });

    return ok({
      transactionNo: result.transactionNo,
      productName: product.name,
      quantity,
      grossAmount,
      buybackCredit,
      differenceAmount,
    }, 201, "Takas işlemi tamamlandi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}


