import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { productId, sourceBranchId, targetBranchId, quantity } = body;

    if (!productId || !sourceBranchId || !targetBranchId || quantity === undefined) {
      return fail("Eksik bilgi: Ürün, kaynak şube, hedef şube ve adet alanları zorunludur.", "VALIDATION", 400);
    }

    if (quantity <= 0) {
      return fail("Transfer adeti 0'dan büyük olmalıdır.", "VALIDATION", 400);
    }

    if (sourceBranchId === targetBranchId) {
      return fail("Kaynak şube ile hedef şube aynı olamaz.", "VALIDATION", 400);
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      
      // Ensure branch stocks arrays exist
      if (!store.productBranchStocks) store.productBranchStocks = [];

      // Check source stock
      const sourceStockIndex = store.productBranchStocks.findIndex(
        (s) => s.productId === productId && s.branchId === sourceBranchId
      );

      const sourceStockVal = sourceStockIndex !== -1 ? store.productBranchStocks[sourceStockIndex].stock : 0;
      if (sourceStockVal < quantity) {
        return fail("Kaynak şubede yeterli stok bulunmuyor.", "VALIDATION", 400);
      }

      // Decrement source stock
      store.productBranchStocks[sourceStockIndex].stock -= quantity;

      // Increment or create target stock
      const targetStockIndex = store.productBranchStocks.findIndex(
        (s) => s.productId === productId && s.branchId === targetBranchId
      );

      if (targetStockIndex !== -1) {
        store.productBranchStocks[targetStockIndex].stock += quantity;
      } else {
        store.productBranchStocks.push({
          id: localId("stock"),
          productId,
          branchId: targetBranchId,
          stock: quantity,
        });
      }

      // LOG STOCK TRANSFER
      const productName = productId === "demo-prod-1" ? "Type-C Hizli Sarj Adaptoru" : productId === "demo-prod-2" ? "Temperli Cam" : "Bilinmeyen Ürün";
      const sourceBranchName = store.branches?.find(b => b.id === sourceBranchId)?.name || "Bilinmeyen Şube";
      const targetBranchName = store.branches?.find(b => b.id === targetBranchId)?.name || "Bilinmeyen Şube";

      if (!store.transferLogs) store.transferLogs = [];
      store.transferLogs.unshift({
        id: localId("transfer-log"),
        productId,
        productName,
        sourceBranchId,
        sourceBranchName,
        targetBranchId,
        targetBranchName,
        quantity,
        createdAt: new Date().toISOString(),
      });

      await writeLocalStore(store);
      return ok({ success: true }, 200, "Stok transferi başarıyla tamamlandı");
    }

    // Database mode
    const result = await prisma.$transaction(async (tx) => {
      // Find source stock
      const sourceStock = await tx.productBranchStock.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId: sourceBranchId,
          },
        },
      });

      if (!sourceStock || sourceStock.stock < quantity) {
        throw new Error("Kaynak şubede yeterli stok bulunmuyor.");
      }

      // Decrement source stock
      await tx.productBranchStock.update({
        where: {
          id: sourceStock.id,
        },
        data: {
          stock: { decrement: quantity },
        },
      });

      // Increment/create target stock
      await tx.productBranchStock.upsert({
        where: {
          productId_branchId: {
            productId,
            branchId: targetBranchId,
          },
        },
        create: {
          productId,
          branchId: targetBranchId,
          stock: quantity,
        },
        update: {
          stock: { increment: quantity },
        },
      });

      return { success: true };
    });

    // Write audit log in database mode
    const product = await prisma.product.findUnique({ where: { id: productId } });
    const sourceBranch = await prisma.branch.findUnique({ where: { id: sourceBranchId } });
    const targetBranch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
    
    const productName = product?.name || "Bilinmeyen Ürün";
    const sourceBranchName = sourceBranch?.name || "Bilinmeyen Şube";
    const targetBranchName = targetBranch?.name || "Bilinmeyen Şube";

    const logDetail = JSON.stringify({
      productId,
      productName,
      sourceBranchId,
      sourceBranchName,
      targetBranchId,
      targetBranchName,
      quantity,
    });

    await writeAuditLog({
      action: "STOCK_TRANSFER",
      entityType: "Product",
      entityId: productId,
      detail: logDetail,
      actorUserId: auth.user?.userId,
    });

    return ok(result, 200, "Stok transferi başarıyla tamamlandı");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
