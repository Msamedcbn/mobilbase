import { prisma } from "@/lib/prisma";
import { posCheckoutSchema } from "@/lib/validations";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = posCheckoutSchema.safeParse(body);
    if (!parsed.success) return fail("Checkout verisi gecersiz", "VALIDATION", 400);

    const { items, paymentMethod, customerId, branchId, relatedBuybackId, tradeInRef, bankAccountId, installmentCount, interestRate } = parsed.data;
    let totalAmount = items.reduce((sum, item) => {
      const lineBase = item.unitPrice * item.quantity;
      const discount = lineBase * (item.discountPct / 100);
      return sum + (lineBase - discount);
    }, 0);

    if (paymentMethod === "INSTALLMENT" && interestRate) {
      totalAmount = totalAmount * (1 + interestRate / 100);
    }

    let installmentsToReturn: any[] | undefined = undefined;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const transactionNo = `POS-DEMO-${Date.now()}`;

      // Check and update branch stock if branchId is provided
      const activeBranchId = branchId || "branch-kadikoy";
      if (activeBranchId) {
        if (!store.productBranchStocks) store.productBranchStocks = [];
        for (const item of items) {
          const bStockIndex = store.productBranchStocks.findIndex(
            (s) => s.productId === item.productId && s.branchId === activeBranchId
          );
          const currentStock = bStockIndex !== -1 ? store.productBranchStocks[bStockIndex].stock : 0;
          if (currentStock < item.quantity) {
            return fail(`Seçilen şubede bu ürün için yeterli stok bulunmuyor. (Mevcut: ${currentStock})`, "STOCK", 409);
          }
        }
        // Decrement
        for (const item of items) {
          const bStockIndex = store.productBranchStocks.findIndex(
            (s) => s.productId === item.productId && s.branchId === activeBranchId
          );
          store.productBranchStocks[bStockIndex].stock -= item.quantity;
        }
      }

      if (paymentMethod === "ON_ACCOUNT") {
        if (!customerId) {
          return fail("Cari hesap satisinda musteri secimi zorunlu", "VALIDATION", 400);
        }
        const customer = store.customers.find((c) => c.id === customerId);
        if (!customer) {
          return fail("Musteri bulunamadi", "NOT_FOUND", 404);
        }
        const customerEntries = (store.accountEntries || []).filter((e) => e.customerId === customerId);
        const netBalance = customerEntries.reduce((sum, entry) => {
          return sum + (entry.type === "DEBIT" ? entry.amount : -entry.amount);
        }, 0);
        const limit = customer.creditLimit ?? 0;
        if (netBalance + totalAmount > limit) {
          return fail("Bu işlem müşterinin veresiye limitini aşmaktadır.", "VALIDATION", 400);
        }

        if (!store.accountEntries) store.accountEntries = [];
        store.accountEntries.push({
          id: localId("entry"),
          customerId,
          type: "DEBIT",
          amount: totalAmount,
          description: `${transactionNo} no'lu POS satis borcu`,
          createdAt: new Date().toISOString(),
        });
      } else if (paymentMethod === "INSTALLMENT") {
        if (customerId) {
          const customer = store.customers.find((c) => c.id === customerId);
          if (!customer) {
            return fail("Müşteri bulunamadı", "NOT_FOUND", 404);
          }
          const customerEntries = (store.accountEntries || []).filter((e) => e.customerId === customerId);
          const netBalance = customerEntries.reduce((sum, entry) => {
            return sum + (entry.type === "DEBIT" ? entry.amount : -entry.amount);
          }, 0);
          const activeInstallmentDebts = (store.installmentSales || [])
            .filter((s) => s.customerId === customerId)
            .reduce((sum, s) => sum + s.remainingAmount, 0);

          const limit = customer.creditLimit ?? 0;
          if (netBalance + activeInstallmentDebts + totalAmount > limit) {
            return fail("Bu işlem müşterinin limitini aşmaktadır.", "VALIDATION", 400);
          }
        }

        const count = installmentCount || 1;
        const rate = interestRate || 0;
        const installments = [];
        const monthlyAmount = Math.round((totalAmount / count) * 100) / 100;
        let addedAmount = 0;

        for (let i = 1; i <= count; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);

          let currentInstAmount = monthlyAmount;
          if (i === count) {
            currentInstAmount = Math.round((totalAmount - addedAmount) * 100) / 100;
          } else {
            addedAmount += monthlyAmount;
          }

          installments.push({
            id: localId("inst"),
            installmentNo: i,
            dueDate: dueDate.toISOString(),
            amount: currentInstAmount,
            status: "UNPAID" as const,
            paidAt: null,
            bankAccountId: null,
          });
        }

        if (!store.installmentSales) store.installmentSales = [];
        store.installmentSales.push({
          id: localId("inst-sale"),
          transactionNo,
          customerId: customerId || null,
          totalAmount,
          installmentCount: count,
          interestRate: rate,
          remainingAmount: totalAmount,
          createdAt: new Date().toISOString(),
          installments,
        });
        installmentsToReturn = installments;
      } else if (bankAccountId) {
        const bank = store.bankAccounts?.find((b) => b.id === bankAccountId);
        if (bank) {
          bank.balance = Number(bank.balance) + totalAmount;
        }
      }

      const newTransaction = {
        id: localId("tr"),
        transactionNo,
        type: "INCOME" as const,
        paymentMethod,
        customerId: customerId || null,
        totalAmount,
        note: `Hizli satis checkout${relatedBuybackId ? ` / relatedBuybackId:${relatedBuybackId}` : ""}${tradeInRef ? ` / tradeInRef:${tradeInRef}` : ""}${paymentMethod === "INSTALLMENT" ? ` / Taksitli Satış: ${installmentCount} Taksit / Oran: %${interestRate}` : ""}`,
        createdAt: new Date().toISOString(),
        branchId: activeBranchId,
        bankAccountId: bankAccountId || null,
      };
      if (!store.transactions) store.transactions = [];
      store.transactions.unshift(newTransaction);

      await writeLocalStore(store);
      return ok({
        transactionId: newTransaction.id,
        transactionNo,
        paymentMethod,
        totalAmount,
        relatedBuybackId: relatedBuybackId ?? null,
        tradeInRef: tradeInRef ?? null,
        items: items.map((i) => ({
          productName: i.productId,
          quantity: i.quantity,
          lineTotal: i.unitPrice * i.quantity - (i.unitPrice * i.quantity * i.discountPct) / 100,
        })),
        installments: installmentsToReturn,
      }, 201, "Satis tamamlandi");
    }

    if (paymentMethod === "ON_ACCOUNT" || (paymentMethod === "INSTALLMENT" && customerId)) {
      if (paymentMethod === "ON_ACCOUNT" && !customerId) {
        return fail("Cari hesap satisinda musteri secimi zorunlu", "VALIDATION", 400);
      }
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { accountEntries: true },
      });
      if (!customer) {
        return fail("Musteri bulunamadi", "NOT_FOUND", 404);
      }
      const netBalance = customer.accountEntries.reduce((sum, entry) => {
        return sum + (entry.type === "DEBIT" ? Number(entry.amount) : -Number(entry.amount));
      }, 0);
      const limit = Number(customer.creditLimit);
      if (netBalance + totalAmount > limit) {
        return fail("Bu işlem müşterinin veresiye/taksit limitini aşmaktadır.", "VALIDATION", 400);
      }
    }

    if (auth.user?.role !== "ADMIN" && items.some((i) => i.discountPct > 0)) {
      return fail("Indirim/fiyat override yetkisi sadece admin kullanicida", "FORBIDDEN", 403);
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeBranchId = branchId;
      if (activeBranchId) {
        const stocks = await tx.productBranchStock.findMany({
          where: {
            productId: { in: items.map((i) => i.productId) },
            branchId: activeBranchId,
          },
        });
        const stockMap = new Map(stocks.map((s) => [s.productId, s]));
        const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of items) {
          const product = productMap.get(item.productId);
          const bStock = stockMap.get(item.productId);
          const currentStock = bStock ? bStock.stock : 0;
          if (!product) return { error: fail(`Urun bulunamadi: ${item.productId}`, "NOT_FOUND", 404) };
          if (currentStock < item.quantity) {
            return { error: fail(`${product.name} icin şube stoğu yetersiz (Stok: ${currentStock})`, "STOCK", 409) };
          }
        }

        for (const item of items) {
          await tx.productBranchStock.update({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: activeBranchId,
              },
            },
            data: { stock: { decrement: item.quantity } },
          });
        }
      } else {
        const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
        const map = new Map(products.map((p) => [p.id, p]));

        for (const item of items) {
          const product = map.get(item.productId);
          if (!product) return { error: fail(`Urun bulunamadi: ${item.productId}`, "NOT_FOUND", 404) };
          if (product.stock < item.quantity) return { error: fail(`${product.name} icin stok yetersiz`, "STOCK", 409) };
        }

        for (const item of items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        }
      }

      const dbPaymentMethod = paymentMethod === "INSTALLMENT" ? "ON_ACCOUNT" : paymentMethod;
      const transaction = await tx.transaction.create({
        data: {
          transactionNo: `POS-${Date.now()}`,
          type: "INCOME",
          paymentMethod: dbPaymentMethod as any,
          customerId: customerId ?? null,
          branchId: activeBranchId ?? null,
          totalAmount,
          bankAccountId: bankAccountId ?? null,
          note: `Hizli satis checkout${relatedBuybackId ? ` / relatedBuybackId:${relatedBuybackId}` : ""}${tradeInRef ? ` / tradeInRef:${tradeInRef}` : ""}${paymentMethod === "INSTALLMENT" ? ` / Taksitli Satış: ${installmentCount} Taksit / Oran: %${interestRate}` : ""}`,
          items: {
            create: items.map((item) => {
              const lineBase = item.unitPrice * item.quantity;
              const discount = lineBase * (item.discountPct / 100);
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: lineBase - discount,
              };
            }),
          },
        },
        include: { items: { include: { product: true } } },
      });

      if ((paymentMethod === "ON_ACCOUNT" || paymentMethod === "INSTALLMENT") && customerId) {
        await tx.accountEntry.create({
          data: {
            customerId,
            type: "DEBIT",
            amount: totalAmount,
            description: `${transaction.transactionNo} no'lu POS satis borcu ${paymentMethod === "INSTALLMENT" ? `(${installmentCount} Taksit)` : ""}`,
          },
        });
      } else if (bankAccountId) {
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { increment: totalAmount } },
        });
      }

      return { transaction };
    });

    if ("error" in result) return result.error;

    if (paymentMethod === "INSTALLMENT") {
      const store = await readLocalStore();
      const count = installmentCount || 1;
      const rate = interestRate || 0;
      const installments = [];
      const monthlyAmount = Math.round((totalAmount / count) * 100) / 100;
      let addedAmount = 0;

      for (let i = 1; i <= count; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);

        let currentInstAmount = monthlyAmount;
        if (i === count) {
          currentInstAmount = Math.round((totalAmount - addedAmount) * 100) / 100;
        } else {
          addedAmount += monthlyAmount;
        }

        installments.push({
          id: localId("inst"),
          installmentNo: i,
          dueDate: dueDate.toISOString(),
          amount: currentInstAmount,
          status: "UNPAID" as const,
          paidAt: null,
          bankAccountId: null,
        });
      }

      if (!store.installmentSales) store.installmentSales = [];
      store.installmentSales.push({
        id: localId("inst-sale"),
        transactionNo: result.transaction.transactionNo,
        customerId: customerId || null,
        totalAmount,
        installmentCount: count,
        interestRate: rate,
        remainingAmount: totalAmount,
        createdAt: new Date().toISOString(),
        installments,
      });
      installmentsToReturn = installments;
      await writeLocalStore(store);
    }

    await writeAuditLog({
      action: "POS_CHECKOUT",
      entityType: "Transaction",
      entityId: result.transaction.id,
      actorUserId: auth.user?.userId,
      customerId: result.transaction.customerId ?? undefined,
      detail: `${result.transaction.transactionNo} / ${result.transaction.totalAmount.toString()}`,
    });

    return ok({
      transactionId: result.transaction.id,
      transactionNo: result.transaction.transactionNo,
      paymentMethod: result.transaction.paymentMethod,
      totalAmount: Number(result.transaction.totalAmount),
      relatedBuybackId: relatedBuybackId ?? null,
      tradeInRef: tradeInRef ?? null,
      items: result.transaction.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
      installments: installmentsToReturn,
    }, 201, "Satis tamamlandi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
