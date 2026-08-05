import { prisma } from "@/lib/prisma";
import { posCheckoutSchema } from "@/lib/validations";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { validateBuybackSellability } from "@/lib/buyback-stock";
import { findPriceMismatch, resolveBranchPrice } from "@/lib/pos-pricing";

function generateNumericReceiptNo() {
  return `${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Authoritative sale price per product, honouring a branch override when one is
 * set. See lib/pos-pricing.ts for why the client-sent price is never trusted.
 */
async function resolveAuthoritativePrices(
  productIds: string[],
  tenantId: string | null | undefined,
  branchId: string | undefined,
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    for (const id of productIds) {
      const item = (store.stockItems || []).find((s) => s.id === id && s.tenantId === tenantId);
      if (!item) continue;
      const override = branchId
        ? (store.productBranchStocks || []).find((s) => s.productId === id && s.branchId === branchId)?.price
        : null;
      prices.set(id, resolveBranchPrice(item.salePrice, override));
    }
    return prices;
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId },
    select: {
      id: true,
      salePrice: true,
      branchStocks: branchId ? { where: { branchId }, select: { price: true } } : false,
    },
  });

  for (const product of products) {
    const override = (product as { branchStocks?: Array<{ price: unknown }> }).branchStocks?.[0]?.price;
    prices.set(product.id, resolveBranchPrice(product.salePrice as unknown as number, override as number | null));
  }
  return prices;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kart",
  ON_ACCOUNT: "Veresiye",
  INSTALLMENT: "Taksitli",
};

type PaymentLeg = {
  method: "CASH" | "CREDIT_CARD" | "ON_ACCOUNT" | "INSTALLMENT";
  amount: number;
  bankAccountId?: string;
  installmentCount?: number;
  interestRate?: number;
};

// Amount actually owed for this leg once its own interest (if any) is applied.
// `leg.amount` is always the pre-interest portion of the sale allocated to it.
function legFinalAmount(leg: PaymentLeg) {
  if (leg.method === "INSTALLMENT" && leg.interestRate) {
    return Math.round(leg.amount * (1 + leg.interestRate / 100) * 100) / 100;
  }
  return Math.round(leg.amount * 100) / 100;
}

function buildInstallmentSchedule(totalAmount: number, count: number) {
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
  return installments;
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = posCheckoutSchema.safeParse(body);
    if (!parsed.success) return fail("Checkout verisi geçersiz", "VALIDATION", 400);

    const { items, customerId, branchId, relatedBuybackId, tradeInRef } = parsed.data;

    // Fiyat, istemciden gelen değere göre değil sunucudaki kayda göre belirlenir.
    // Aksi halde değiştirilmiş bir istek ürünü istediği tutara satabilirdi.
    const authoritativePrices = await resolveAuthoritativePrices(
      items.map((i) => i.productId),
      auth.user?.tenantId,
      branchId,
    );
    const priceMismatch = findPriceMismatch(items, authoritativePrices);
    if (priceMismatch) {
      if (priceMismatch.kind === "unknown-product") {
        return fail("Sepetteki bir ürün bulunamadı veya bu işletmeye ait değil.", "VALIDATION", 400);
      }
      return fail(
        `Ürün fiyatı güncellenmiş görünüyor (beklenen: ${priceMismatch.expected.toLocaleString("tr-TR")} TL). Sepeti yenileyip tekrar deneyin.`,
        "VALIDATION",
        409,
      );
    }

    const subtotal = items.reduce((sum, item) => {
      const lineBase = item.unitPrice * item.quantity;
      const discount = lineBase * (item.discountPct / 100);
      return sum + (lineBase - discount);
    }, 0);

    const legs: PaymentLeg[] =
      parsed.data.payments && parsed.data.payments.length > 0
        ? parsed.data.payments
        : [
            {
              method: parsed.data.paymentMethod!,
              amount: subtotal,
              bankAccountId: parsed.data.bankAccountId,
              installmentCount: parsed.data.installmentCount,
              interestRate: parsed.data.interestRate,
            },
          ];

    const allocatedSum = Math.round(legs.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    if (Math.abs(allocatedSum - roundedSubtotal) > 0.01) {
      return fail(
        `Ödeme tutarları toplamı (${allocatedSum.toLocaleString("tr-TR")} TL) satış tutarına (${roundedSubtotal.toLocaleString("tr-TR")} TL) eşit değil`,
        "VALIDATION",
        400,
      );
    }

    const isSplit = legs.length > 1;
    const totalFinalAmount = legs.reduce((s, l) => s + legFinalAmount(l), 0);
    const debtPortion = legs
      .filter((l) => l.method === "ON_ACCOUNT" || l.method === "INSTALLMENT")
      .reduce((s, l) => s + legFinalAmount(l), 0);

    const soldByUserId = auth.user?.userId ?? null;
    const primaryMethod = isSplit ? "MIXED" : legs[0].method;

    // Per-staff veresiye approval ceiling — ADMIN/MANAGER/PLATFORM_OWNER bypass
    // by design (requireRole already restricted who reaches this point to
    // ADMIN/CASHIER/MANAGER, so the only role this can actually gate is CASHIER).
    if (debtPortion > 0 && auth.user?.role === "CASHIER" && soldByUserId) {
      const actingStaff = isDbDisabledMode()
        ? (await readLocalStore()).users?.find((u) => u.id === soldByUserId)
        : await prisma.appUser.findUnique({ where: { id: soldByUserId }, select: { maxCreditApprovalLimit: true } });
      const staffLimit = actingStaff ? Number((actingStaff as any).maxCreditApprovalLimit) : NaN;
      if (!Number.isNaN(staffLimit) && staffLimit > 0 && debtPortion > staffLimit) {
        return fail(
          `Bu tutar (${debtPortion.toLocaleString("tr-TR")} TL) veresiye onay limitinizi (${staffLimit.toLocaleString("tr-TR")} TL) aşıyor. Bir yöneticiden onay isteyin.`,
          "VALIDATION",
          403,
        );
      }
    }

    let installmentsToReturn: any[] | undefined = undefined;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const groupTransactionNo = generateNumericReceiptNo();
      const localStockById = new Map((store.stockItems || []).map((s: any) => [s.id, s]));

      // Check and update branch stock if branchId is provided, else update global stock
      const activeBranchId = branchId;
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
          const stockItem = localStockById.get(item.productId) as any;
          const sellabilityError = validateBuybackSellability(stockItem);
          if (sellabilityError) return fail(sellabilityError, "VALIDATION", 400);
          if (stockItem && Number(stockItem.quantity) < item.quantity) {
            return fail(`Bu ürün için stok kartı miktarı yetersiz (Mevcut: ${stockItem.quantity})`, "STOCK", 409);
          }
        }
        // Decrement
        for (const item of items) {
          const bStockIndex = store.productBranchStocks.findIndex(
            (s) => s.productId === item.productId && s.branchId === activeBranchId
          );
          if (bStockIndex !== -1) {
            store.productBranchStocks[bStockIndex].stock -= item.quantity;
          }
          const sItemIndex = store.stockItems.findIndex((s) => s.id === item.productId);
          if (sItemIndex !== -1) {
            const stockItem = store.stockItems[sItemIndex] as any;
            const remaining = Number(stockItem.quantity) - item.quantity;
            if (stockItem.imei && remaining <= 0) {
              store.stockItems.splice(sItemIndex, 1);
              store.productBranchStocks = store.productBranchStocks.filter((s) => s.productId !== item.productId);
            } else {
              stockItem.quantity = remaining;
            }
          }
        }
      } else {
        if (!store.stockItems) store.stockItems = [];
        for (const item of items) {
          const sItemIndex = store.stockItems.findIndex((s) => s.id === item.productId);
          const currentStock = sItemIndex !== -1 ? store.stockItems[sItemIndex].quantity : 0;
          if (currentStock < item.quantity) {
            return fail(`Bu ürün için genel stok yetersiz (Mevcut: ${currentStock})`, "STOCK", 409);
          }
          const stockItem = sItemIndex !== -1 ? (store.stockItems[sItemIndex] as any) : null;
          const sellabilityError = validateBuybackSellability(stockItem);
          if (sellabilityError) return fail(sellabilityError, "VALIDATION", 400);
        }
        // Decrement
        for (const item of items) {
          const sItemIndex = store.stockItems.findIndex((s) => s.id === item.productId);
          if (sItemIndex !== -1) {
            const stockItem = store.stockItems[sItemIndex] as any;
            const remaining = Number(stockItem.quantity) - item.quantity;
            if (stockItem.imei && remaining <= 0) {
              store.stockItems.splice(sItemIndex, 1);
            } else {
              stockItem.quantity = remaining;
            }
          }
        }
      }

      if (debtPortion > 0 && customerId) {
        const customer = store.customers.find((c) => c.id === customerId);
        if (!customer) {
          return fail("Müşteri bulunamadi", "NOT_FOUND", 404);
        }
        const customerEntries = (store.accountEntries || []).filter((e) => e.customerId === customerId);
        const netBalance = customerEntries.reduce((sum, entry) => {
          return sum + (entry.type === "DEBIT" ? entry.amount : -entry.amount);
        }, 0);
        const activeInstallmentDebts = (store.installmentSales || [])
          .filter((s) => s.customerId === customerId)
          .reduce((sum, s) => sum + s.remainingAmount, 0);
        const limit = customer.creditLimit ?? 0;
        if (netBalance + activeInstallmentDebts + debtPortion > limit) {
          return fail("Bu işlem müşterinin veresiye/taksit limitini aşmaktadır.", "VALIDATION", 400);
        }
      }

      if (!store.transactions) store.transactions = [];

      legs.forEach((leg, idx) => {
        const legAmount = legFinalAmount(leg);
        const transactionNo = idx === 0 ? groupTransactionNo : generateNumericReceiptNo();
        const legNote =
          idx === 0
            ? `Hizli satış checkout${isSplit ? " (Parçalı Ödeme)" : ""}${relatedBuybackId ? ` / relatedBuybackId:${relatedBuybackId}` : ""}${tradeInRef ? ` / tradeInRef:${tradeInRef}` : ""}${leg.method === "INSTALLMENT" ? ` / Taksitli Satış: ${leg.installmentCount || 1} Taksit / Oran: %${leg.interestRate || 0}` : ""}`
            : `Satış #${groupTransactionNo} — Parça Ödeme (${PAYMENT_METHOD_LABELS[leg.method]})${leg.method === "INSTALLMENT" ? ` / ${leg.installmentCount || 1} Taksit / Oran: %${leg.interestRate || 0}` : ""}`;

        if (leg.method === "ON_ACCOUNT") {
          if (!store.accountEntries) store.accountEntries = [];
          store.accountEntries.push({
            id: localId("entry"),
            customerId: customerId!,
            type: "DEBIT",
            amount: legAmount,
            description: `${transactionNo} no'lu POS satış borcu`,
            createdAt: new Date().toISOString(),
          });
        } else if (leg.method === "INSTALLMENT") {
          const count = leg.installmentCount || 1;
          const installments = buildInstallmentSchedule(legAmount, count);
          if (!store.installmentSales) store.installmentSales = [];
          store.installmentSales.push({
            id: localId("inst-sale"),
            transactionNo,
            customerId: customerId || null,
            totalAmount: legAmount,
            installmentCount: count,
            interestRate: leg.interestRate || 0,
            remainingAmount: legAmount,
            createdAt: new Date().toISOString(),
            installments,
          });
          installmentsToReturn = installments;
        } else if (leg.bankAccountId) {
          const bank = store.bankAccounts?.find((b) => b.id === leg.bankAccountId);
          if (bank) {
            bank.balance = Number(bank.balance) + legAmount;
          }
        }

        store.transactions!.unshift({
          id: localId("tr"),
          transactionNo,
          type: "INCOME" as const,
          paymentMethod: leg.method,
          customerId: customerId || null,
          totalAmount: legAmount,
          note: legNote,
          createdAt: new Date().toISOString(),
          branchId: activeBranchId,
          bankAccountId: leg.bankAccountId || null,
          groupNo: isSplit ? groupTransactionNo : null,
          soldByUserId,
        });
      });

      await writeLocalStore(store);
      return ok({
        transactionId: groupTransactionNo,
        transactionNo: groupTransactionNo,
        groupNo: isSplit ? groupTransactionNo : null,
        paymentMethod: primaryMethod,
        totalAmount: totalFinalAmount,
        relatedBuybackId: relatedBuybackId ?? null,
        tradeInRef: tradeInRef ?? null,
        items: items.map((i) => ({
          productName: i.productId,
          quantity: i.quantity,
          lineTotal: i.unitPrice * i.quantity - (i.unitPrice * i.quantity * i.discountPct) / 100,
        })),
        payments: legs.map((l) => ({
          method: l.method,
          amount: legFinalAmount(l),
          bankAccountId: l.bankAccountId ?? null,
          installmentCount: l.installmentCount ?? null,
          interestRate: l.interestRate ?? null,
        })),
        installments: installmentsToReturn,
      }, 201, "Satış tamamlandi");
    }

    const tenantId = auth.user.tenantId;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { accountEntries: true },
    });
    if (!customer) {
      return fail("Müşteri bulunamadi", "NOT_FOUND", 404);
    }
    if (debtPortion > 0) {
      const netBalance = customer.accountEntries.reduce((sum, entry) => {
        return sum + (entry.type === "DEBIT" ? Number(entry.amount) : -Number(entry.amount));
      }, 0);
      const limit = Number(customer.creditLimit);
      if (netBalance + debtPortion > limit) {
        return fail("Bu işlem müşterinin veresiye/taksit limitini aşmaktadır.", "VALIDATION", 400);
      }
    }

    if (auth.user?.role !== "ADMIN" && auth.user?.role !== "MANAGER" && items.some((i) => i.discountPct > 0)) {
      return fail("Indirim/fiyat override yetkisi sadece admin kullanicida", "FORBIDDEN", 403);
    }

    const result = await prisma.$transaction(async (tx) => {
      const activeBranchId = branchId;
      let productMap: Map<string, any>;

      if (activeBranchId) {
        const stocks = await tx.productBranchStock.findMany({
          where: {
            productId: { in: items.map((i) => i.productId) },
            branchId: activeBranchId,
          },
        });
        const stockMap = new Map(stocks.map((s) => [s.productId, s]));
        const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, tenantId } });
        productMap = new Map(products.map((p) => [p.id, p]));
        const stockItems = await tx.stockItem.findMany({
          where: { tenantId, sku: { in: products.map((p) => p.barcode) } },
          select: { id: true, sku: true, quantity: true, imei: true, isBuybackItem: true, buybackSaleEnabled: true, buybackProcessStatus: true, name: true },
        });
        const stockItemBySku = new Map(stockItems.map((s) => [s.sku, s]));

        for (const item of items) {
          const product = productMap.get(item.productId);
          const bStock = stockMap.get(item.productId);
          const currentStock = bStock ? bStock.stock : 0;
          if (!product) return { error: fail(`Ürün bulunamadı: ${item.productId}`, "NOT_FOUND", 404) };
          const stockItem = stockItemBySku.get(product.barcode);
          const sellabilityError = validateBuybackSellability(stockItem);
          if (sellabilityError) return { error: fail(sellabilityError, "VALIDATION", 400) };
          if (currentStock < item.quantity) {
            return { error: fail(`${product.name} için şube stoğu yetersiz (Stok: ${currentStock})`, "STOCK", 409) };
          }
          if (stockItem && stockItem.quantity < item.quantity) {
            return { error: fail(`${product.name} için stok kartı miktarı yetersiz (Stok: ${stockItem.quantity})`, "STOCK", 409) };
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
          const product = productMap.get(item.productId);
          const stockItem = product ? stockItemBySku.get(product.barcode) : undefined;
          if (stockItem) {
            const remaining = stockItem.quantity - item.quantity;
            // Serialized (IMEI) stock cards represent a single unique unit — once sold
            // there is nothing left to restock, so remove the card instead of leaving
            // a zeroed-out row behind.
            if (stockItem.imei && remaining <= 0) {
              await tx.stockItem.delete({ where: { id: stockItem.id } });
            } else {
              await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: { decrement: item.quantity } } });
            }
          }
        }
      } else {
        const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, tenantId } });
        productMap = new Map(products.map((p) => [p.id, p]));
        const stockItems = await tx.stockItem.findMany({
          where: { tenantId, sku: { in: products.map((p) => p.barcode) } },
          select: { id: true, sku: true, quantity: true, imei: true, isBuybackItem: true, buybackSaleEnabled: true, buybackProcessStatus: true, name: true },
        });
        const stockItemBySku = new Map(stockItems.map((s) => [s.sku, s]));

        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) return { error: fail(`Ürün bulunamadı: ${item.productId}`, "NOT_FOUND", 404) };
          const stockItem = stockItemBySku.get(product.barcode);
          const sellabilityError = validateBuybackSellability(stockItem);
          if (sellabilityError) return { error: fail(sellabilityError, "VALIDATION", 400) };
          if (product.stock < item.quantity) return { error: fail(`${product.name} icin stok yetersiz`, "STOCK", 409) };
          if (stockItem && stockItem.quantity < item.quantity) {
            return { error: fail(`${product.name} için stok kartı miktarı yetersiz (Stok: ${stockItem.quantity})`, "STOCK", 409) };
          }
        }

        for (const item of items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
          const product = productMap.get(item.productId);
          const stockItem = product ? stockItemBySku.get(product.barcode) : undefined;
          if (stockItem) {
            const remaining = stockItem.quantity - item.quantity;
            if (stockItem.imei && remaining <= 0) {
              await tx.stockItem.delete({ where: { id: stockItem.id } });
            } else {
              await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: { decrement: item.quantity } } });
            }
          }
        }
      }

      const groupTransactionNo = generateNumericReceiptNo();
      const createdLegs: Array<{ transaction: any; leg: PaymentLeg }> = [];

      for (let idx = 0; idx < legs.length; idx++) {
        const leg = legs[idx];
        const legAmount = legFinalAmount(leg);
        const dbPaymentMethod = leg.method === "INSTALLMENT" ? "ON_ACCOUNT" : leg.method;
        const transactionNo = idx === 0 ? groupTransactionNo : generateNumericReceiptNo();
        const legNote =
          idx === 0
            ? `Hizli satış checkout${isSplit ? " (Parçalı Ödeme)" : ""}${relatedBuybackId ? ` / relatedBuybackId:${relatedBuybackId}` : ""}${tradeInRef ? ` / tradeInRef:${tradeInRef}` : ""}${leg.method === "INSTALLMENT" ? ` / Taksitli Satış: ${leg.installmentCount || 1} Taksit / Oran: %${leg.interestRate || 0}` : ""}`
            : `Satış #${groupTransactionNo} — Parça Ödeme (${PAYMENT_METHOD_LABELS[leg.method]})${leg.method === "INSTALLMENT" ? ` / ${leg.installmentCount || 1} Taksit / Oran: %${leg.interestRate || 0}` : ""}`;

        const transaction = await tx.transaction.create({
          data: {
            transactionNo,
            type: "INCOME",
            paymentMethod: dbPaymentMethod as any,
            customerId,
            branchId: activeBranchId ?? null,
            totalAmount: legAmount,
            bankAccountId: leg.bankAccountId ?? null,
            tenantId,
            groupNo: isSplit ? groupTransactionNo : null,
            soldByUserId,
            note: legNote,
            items:
              idx === 0
                ? {
                    create: items.map((item) => {
                      const lineBase = item.unitPrice * item.quantity;
                      const discount = lineBase * (item.discountPct / 100);
                      const product = productMap.get(item.productId);
                      return {
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        lineTotal: lineBase - discount,
                        unitCost: product ? Number(product.purchasePrice) : 0,
                      };
                    }),
                  }
                : undefined,
          },
          include: { items: { include: { product: true } } },
        });

        if (leg.method === "ON_ACCOUNT" || leg.method === "INSTALLMENT") {
          // Both veresiye and taksitli legs create a DEBIT ledger entry — this is what
          // the credit-limit check above (customer.accountEntries) and the customer's
          // net-balance display rely on, regardless of the separate installment schedule.
          await tx.accountEntry.create({
            data: {
              customerId,
              type: "DEBIT",
              amount: legAmount,
              description: `${transaction.transactionNo} no'lu POS satış borcu${leg.method === "INSTALLMENT" ? ` (${leg.installmentCount || 1} Taksit)` : ""}`,
            },
          });
        } else if (leg.bankAccountId) {
          const bank = await tx.bankAccount.findFirst({ where: { id: leg.bankAccountId, tenantId } });
          if (!bank) return { error: fail("Banka hesabi bulunamadi", "NOT_FOUND", 404) };
          await tx.bankAccount.update({
            where: { id: leg.bankAccountId },
            data: { balance: { increment: legAmount } },
          });
        }

        createdLegs.push({ transaction, leg });
      }

      return { createdLegs, groupTransactionNo };
    });

    if ("error" in result) return result.error;

    const { createdLegs, groupTransactionNo } = result;
    const primaryTransaction = createdLegs[0].transaction;

    // Installment schedules still live in the local JSON store even in DB mode
    // (existing architecture) — write one per INSTALLMENT leg.
    if (legs.some((l) => l.method === "INSTALLMENT")) {
      const store = await readLocalStore();
      if (!store.installmentSales) store.installmentSales = [];
      for (const { transaction, leg } of createdLegs) {
        if (leg.method !== "INSTALLMENT") continue;
        const legAmount = legFinalAmount(leg);
        const count = leg.installmentCount || 1;
        const installments = buildInstallmentSchedule(legAmount, count);
        store.installmentSales.push({
          id: localId("inst-sale"),
          transactionNo: transaction.transactionNo,
          customerId: customerId || null,
          totalAmount: legAmount,
          installmentCount: count,
          interestRate: leg.interestRate || 0,
          remainingAmount: legAmount,
          createdAt: new Date().toISOString(),
          installments,
        });
        installmentsToReturn = installments;
      }
      await writeLocalStore(store);
    }

    await writeAuditLog({
      action: "POS_CHECKOUT",
      entityType: "Transaction",
      entityId: primaryTransaction.id,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      customerId: primaryTransaction.customerId ?? undefined,
      detail: `${groupTransactionNo} / ${totalFinalAmount.toString()}${isSplit ? ` / ${legs.length} bacak` : ""}`,
    });

    return ok({
      transactionId: primaryTransaction.id,
      transactionNo: groupTransactionNo,
      groupNo: isSplit ? groupTransactionNo : null,
      paymentMethod: primaryMethod,
      totalAmount: totalFinalAmount,
      relatedBuybackId: relatedBuybackId ?? null,
      tradeInRef: tradeInRef ?? null,
      items: primaryTransaction.items.map((i: any) => ({
        productName: i.product.name,
        quantity: i.quantity,
        lineTotal: Number(i.lineTotal),
      })),
      payments: createdLegs.map(({ leg }) => ({
        method: leg.method,
        amount: legFinalAmount(leg),
        bankAccountId: leg.bankAccountId ?? null,
        installmentCount: leg.installmentCount ?? null,
        interestRate: leg.interestRate ?? null,
      })),
      installments: installmentsToReturn,
    }, 201, "Satış tamamlandi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
