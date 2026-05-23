import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId || null;

  try {
    const store = await readLocalStore();
    const installmentSales = (store.installmentSales || []).filter((s) => s.tenantId === tenantId);

    let resolvedSales = [];
    if (isDbDisabledMode()) {
      resolvedSales = installmentSales.map((sale) => {
        const customer = sale.customerId ? store.customers.find((c) => c.id === sale.customerId) : null;
        return {
          ...sale,
          customer: customer
            ? { fullName: customer.fullName, phone: customer.phone, email: customer.email }
            : null,
        };
      });
    } else {
      const customerIds = Array.from(new Set(installmentSales.map((s) => s.customerId).filter(Boolean))) as string[];
      const customers = customerIds.length > 0 ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
      }) : [];
      const customerMap = new Map(customers.map((c) => [c.id, c]));
      resolvedSales = installmentSales.map((sale) => {
        const customer = sale.customerId ? customerMap.get(sale.customerId) : null;
        return {
          ...sale,
          customer: customer
            ? { fullName: customer.fullName, phone: customer.phone, email: customer.email }
            : null,
        };
      });
    }

    return ok(resolvedSales);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId || null;

  try {
    const body = await req.json();
    const { customerId, baseAmount, installmentCount, interestRate, firstDueDate, note } = body;

    if (!baseAmount || !installmentCount) {
      return fail("Tutar ve Taksit sayısı alanları zorunludur.", "VALIDATION", 400);
    }

    const amountVal = Number(baseAmount);
    const countVal = Number(installmentCount);
    const interestVal = Number(interestRate || 0);

    if (isNaN(amountVal) || amountVal <= 0) {
      return fail("Tutar pozitif bir sayı olmalıdır.", "VALIDATION", 400);
    }
    if (isNaN(countVal) || countVal < 1 || !Number.isInteger(countVal)) {
      return fail("Taksit sayısı en az 1 ve tam sayı olmalıdır.", "VALIDATION", 400);
    }
    if (isNaN(interestVal) || interestVal < 0) {
      return fail("Vade farkı oranı sıfır veya pozitif bir sayı olmalıdır.", "VALIDATION", 400);
    }

    const totalAmount = Math.round(amountVal * (1 + interestVal / 100) * 100) / 100;
    const store = await readLocalStore();

    let limit = 0;
    let netBalance = 0;
    let activeInstallmentDebts = 0;

    if (customerId) {
      if (isDbDisabledMode()) {
        const customer = store.customers.find((c) => c.id === customerId && c.tenantId === tenantId);
        if (!customer) return fail("Müşteri bulunamadı.", "NOT_FOUND", 404);
        limit = customer.creditLimit ?? 0;

        const customerEntries = (store.accountEntries || []).filter((e) => e.customerId === customerId);
        netBalance = customerEntries.reduce((sum, entry) => {
          return sum + (entry.type === "DEBIT" ? entry.amount : -entry.amount);
        }, 0);
      } else {
        const customer = await prisma.customer.findFirst({
          where: { id: customerId, tenantId },
          include: { accountEntries: true },
        });
        if (!customer) return fail("Müşteri bulunamadı.", "NOT_FOUND", 404);
        limit = Number(customer.creditLimit);

        netBalance = customer.accountEntries.reduce((sum, entry) => {
          return sum + (entry.type === "DEBIT" ? Number(entry.amount) : -Number(entry.amount));
        }, 0);
      }

      activeInstallmentDebts = (store.installmentSales || [])
        .filter((s) => s.customerId === customerId && s.tenantId === tenantId)
        .reduce((sum, s) => sum + s.remainingAmount, 0);

      if (netBalance + activeInstallmentDebts + totalAmount > limit) {
        return fail("Bu işlem müşterinin limitini aşmaktadır.", "VALIDATION", 400);
      }
    }

    // Generate schedule
    const installments = [];
    const monthlyAmount = Math.round((totalAmount / countVal) * 100) / 100;
    let addedAmount = 0;

    const baseDate = firstDueDate ? new Date(firstDueDate) : new Date();
    if (!firstDueDate) {
      baseDate.setMonth(baseDate.getMonth() + 1);
    }

    for (let i = 1; i <= countVal; i++) {
      const dueDate = new Date(baseDate);
      if (i > 1) {
        dueDate.setMonth(baseDate.getMonth() + (i - 1));
      }

      let currentInstAmount = monthlyAmount;
      if (i === countVal) {
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

    const transactionNo = `MAN-POS-${Date.now()}`;

    if (isDbDisabledMode()) {
      if (customerId) {
        if (!store.accountEntries) store.accountEntries = [];
        store.accountEntries.push({
          id: localId("entry"),
          customerId,
          type: "DEBIT",
          amount: totalAmount,
          description: `${transactionNo} no'lu Manuel Taksitli Satış Borcu`,
          createdAt: new Date().toISOString(),
        });
      }

      if (!store.transactions) store.transactions = [];
      store.transactions.unshift({
        id: localId("tr"),
        transactionNo,
        tenantId,
        type: "INCOME",
        paymentMethod: "INSTALLMENT",
        customerId: customerId || null,
        totalAmount,
        note: `Manuel Taksitli Satış: ${countVal} Taksit / Oran: %${interestVal}${note ? ` / Not: ${note}` : ""}`,
        createdAt: new Date().toISOString(),
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            transactionNo,
            tenantId,
            type: "INCOME",
            paymentMethod: customerId ? "ON_ACCOUNT" : "CREDIT_CARD",
            customerId: customerId || null,
            totalAmount,
            note: `Manuel Taksitli Satış: ${countVal} Taksit / Oran: %${interestVal}${note ? ` / Not: ${note}` : ""}`,
          },
        });

        if (customerId) {
          await tx.accountEntry.create({
            data: {
              customerId,
              type: "DEBIT",
              amount: totalAmount,
              description: `${transactionNo} no'lu Manuel Taksitli Satış Borcu`,
            },
          });
        }
      });
    }

    if (!store.installmentSales) store.installmentSales = [];
    const newSale = {
      id: localId("inst-sale"),
      transactionNo,
      tenantId,
      customerId: customerId || null,
      totalAmount,
      installmentCount: countVal,
      interestRate: interestVal,
      remainingAmount: totalAmount,
      createdAt: new Date().toISOString(),
      installments,
    };
    store.installmentSales.push(newSale);
    await writeLocalStore(store);

    return ok(newSale, 201, "Taksit planı başarıyla oluşturuldu.");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { installments } = body;

    if (!Array.isArray(installments)) {
      return fail("installments parametresi dizi (array) olmalıdır.", "VALIDATION", 400);
    }

    const store = await readLocalStore();
    const dbDisabled = isDbDisabledMode();

    // Map to track bank balance adjustments: bankId -> adjustmentAmount
    const bankAdjustments: Record<string, number> = {};
    const dbOperations: Array<() => Promise<void>> = [];

    // Affected sales list to recalculate remainingAmount and totalAmount
    const affectedSaleIds = new Set<string>();

    for (const update of installments) {
      const { saleId, installmentId, dueDate, amount, status, bankAccountId, note } = update;

      if (!saleId || !installmentId) continue;

      const sale = store.installmentSales?.find((s) => s.id === saleId);
      if (!sale) continue;

      const installment = sale.installments.find((i) => i.id === installmentId);
      if (!installment) continue;

      affectedSaleIds.add(saleId);

      const oldStatus = installment.status;
      const newStatus = status;
      const oldBank = installment.bankAccountId;
      const newBank = bankAccountId;
      const oldAmount = installment.amount;
      const newAmount = Number(amount);

      if (isNaN(newAmount) || newAmount <= 0) {
        return fail("Taksit tutarı sıfırdan büyük geçerli bir sayı olmalıdır.", "VALIDATION", 400);
      }

      // Update date and note fields
      installment.dueDate = dueDate || installment.dueDate;
      installment.note = note === undefined ? installment.note : note;

      // Detect status transition
      if (oldStatus === "UNPAID" && newStatus === "PAID") {
        if (!newBank) {
          return fail("Taksit ödenirken banka/kasa seçilmesi zorunludur.", "VALIDATION", 400);
        }

        installment.status = "PAID";
        installment.paidAt = new Date().toISOString();
        installment.bankAccountId = newBank;
        installment.amount = newAmount;

        // Increment bank balance
        bankAdjustments[newBank] = (bankAdjustments[newBank] || 0) + newAmount;

        // 1. Create CREDIT ledger entry (Local Store)
        if (sale.customerId) {
          if (!store.accountEntries) store.accountEntries = [];
          store.accountEntries.push({
            id: localId("entry"),
            customerId: sale.customerId,
            type: "CREDIT",
            amount: newAmount,
            description: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
            createdAt: new Date().toISOString(),
            bankAccountId: newBank,
          });
        }

        // 2. Create System Income Transaction (Local Store)
        const trNo = `POS-COLL-${Date.now()}-${installment.id.slice(-4)}`;
        if (!store.transactions) store.transactions = [];
        store.transactions.unshift({
          id: localId("tr"),
          transactionNo: trNo,
          type: "INCOME",
          paymentMethod: newBank === "bank-nakit" ? "CASH" : "CREDIT_CARD",
          customerId: sale.customerId || null,
          totalAmount: newAmount,
          note: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
          createdAt: new Date().toISOString(),
          bankAccountId: newBank,
        });

        // Database DB operations queue
        if (!dbDisabled) {
          dbOperations.push(async () => {
            await prisma.bankAccount.update({
              where: { id: newBank },
              data: { balance: { increment: newAmount } },
            });

            if (sale.customerId) {
              await prisma.accountEntry.create({
                data: {
                  customerId: sale.customerId,
                  type: "CREDIT",
                  amount: newAmount,
                  description: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
                  bankAccountId: newBank,
                },
              });
            }

            await prisma.transaction.create({
              data: {
                transactionNo: trNo,
                type: "INCOME",
                paymentMethod: newBank === "bank-nakit" ? "CASH" : "CREDIT_CARD",
                customerId: sale.customerId || null,
                totalAmount: newAmount,
                note: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
                bankAccountId: newBank,
              },
            });
          });
        }

      } else if (oldStatus === "PAID" && newStatus === "UNPAID") {
        installment.status = "UNPAID";
        installment.paidAt = null;
        installment.bankAccountId = null;
        installment.amount = newAmount;

        if (oldBank) {
          // Decrement bank balance
          bankAdjustments[oldBank] = (bankAdjustments[oldBank] || 0) - oldAmount;
        }

        // 1. Revert CREDIT entry in Local Store
        store.accountEntries = store.accountEntries?.filter(
          (e) => !(e.customerId === sale.customerId && e.type === "CREDIT" && e.description?.includes(sale.transactionNo) && e.description?.includes(`Taksit #${installment.installmentNo}`))
        );

        // 2. Revert transaction in Local Store
        store.transactions = store.transactions?.filter(
          (t) => !(t.note?.includes(`Taksit Tahsilatı - ${sale.transactionNo}`) && t.note?.includes(`Taksit #${installment.installmentNo}`))
        );

        // Database DB operations queue
        if (!dbDisabled) {
          dbOperations.push(async () => {
            if (oldBank) {
              await prisma.bankAccount.update({
                where: { id: oldBank },
                data: { balance: { decrement: oldAmount } },
              });
            }

            if (sale.customerId) {
              await prisma.accountEntry.deleteMany({
                where: {
                  customerId: sale.customerId,
                  type: "CREDIT",
                  description: {
                    contains: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
                  },
                },
              });
            }

            await prisma.transaction.deleteMany({
              where: {
                note: {
                  contains: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
                },
              },
            });
          });
        }

      } else if (oldStatus === "PAID" && newStatus === "PAID") {
        installment.amount = newAmount;

        // Check if bank account changed
        if (oldBank !== newBank) {
          if (!newBank) {
            return fail("Taksit ödenirken banka/kasa seçilmesi zorunludur.", "VALIDATION", 400);
          }

          installment.bankAccountId = newBank;

          // Adjust bank accounts balances
          if (oldBank) {
            bankAdjustments[oldBank] = (bankAdjustments[oldBank] || 0) - oldAmount;
          }
          bankAdjustments[newBank] = (bankAdjustments[newBank] || 0) + newAmount;

          // Local Store adjustments
          const entry = store.accountEntries?.find(
            (e) => e.customerId === sale.customerId && e.type === "CREDIT" && e.description?.includes(sale.transactionNo) && e.description?.includes(`Taksit #${installment.installmentNo}`)
          );
          if (entry) {
            entry.bankAccountId = newBank;
            entry.amount = newAmount;
          }

          const trans = store.transactions?.find(
            (t) => t.note?.includes(`Taksit Tahsilatı - ${sale.transactionNo}`) && t.note?.includes(`Taksit #${installment.installmentNo}`)
          );
          if (trans) {
            trans.bankAccountId = newBank;
            trans.paymentMethod = newBank === "bank-nakit" ? "CASH" : "CREDIT_CARD";
            trans.totalAmount = newAmount;
          }

          // Database updates
          if (!dbDisabled) {
            dbOperations.push(async () => {
              if (oldBank) {
                await prisma.bankAccount.update({
                  where: { id: oldBank },
                  data: { balance: { decrement: oldAmount } },
                });
              }
              await prisma.bankAccount.update({
                where: { id: newBank },
                data: { balance: { increment: newAmount } },
              });

              if (sale.customerId) {
                await prisma.accountEntry.updateMany({
                  where: {
                    customerId: sale.customerId,
                    type: "CREDIT",
                    description: {
                      contains: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
                    },
                  },
                  data: { bankAccountId: newBank, amount: newAmount },
                });
              }

              await prisma.transaction.updateMany({
                where: {
                  note: {
                    contains: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
                  },
                },
                data: {
                  bankAccountId: newBank,
                  paymentMethod: newBank === "bank-nakit" ? "CASH" : "CREDIT_CARD",
                  totalAmount: newAmount,
                },
              });
            });
          }
        } else {
          // Bank didn't change, but amount changed
          if (oldAmount !== newAmount && oldBank) {
            const diff = newAmount - oldAmount;
            bankAdjustments[oldBank] = (bankAdjustments[oldBank] || 0) + diff;

            // Local store Adjustments
            const entry = store.accountEntries?.find(
              (e) => e.customerId === sale.customerId && e.type === "CREDIT" && e.description?.includes(sale.transactionNo) && e.description?.includes(`Taksit #${installment.installmentNo}`)
            );
            if (entry) {
              entry.amount = newAmount;
            }

            const trans = store.transactions?.find(
              (t) => t.note?.includes(`Taksit Tahsilatı - ${sale.transactionNo}`) && t.note?.includes(`Taksit #${installment.installmentNo}`)
            );
            if (trans) {
              trans.totalAmount = newAmount;
            }

            // Database updates
            if (!dbDisabled) {
              dbOperations.push(async () => {
                await prisma.bankAccount.update({
                  where: { id: oldBank },
                  data: { balance: { increment: diff } },
                });

                if (sale.customerId) {
                  await prisma.accountEntry.updateMany({
                    where: {
                      customerId: sale.customerId,
                      type: "CREDIT",
                      description: {
                        contains: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
                      },
                    },
                    data: { amount: newAmount },
                  });
                }

                await prisma.transaction.updateMany({
                  where: {
                    note: {
                      contains: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
                    },
                  },
                  data: { totalAmount: newAmount },
                });
              });
            }
          }
        }
      } else {
        // UNPAID -> UNPAID, and amount changed
        installment.amount = newAmount;
      }
    }

    // Apply Bank Balance Adjustments to Local Store
    for (const [bankId, adjustment] of Object.entries(bankAdjustments)) {
      if (adjustment === 0) continue;
      const bank = store.bankAccounts?.find((b) => b.id === bankId);
      if (bank) {
        bank.balance = Number(bank.balance) + adjustment;
      }
    }

    // Recalculate affected sales totalAmount and remainingAmount
    for (const saleId of affectedSaleIds) {
      const sale = store.installmentSales?.find((s) => s.id === saleId);
      if (sale) {
        const total = sale.installments.reduce((sum, inst) => sum + inst.amount, 0);
        const remaining = sale.installments
          .filter((inst) => inst.status === "UNPAID")
          .reduce((sum, inst) => sum + inst.amount, 0);

        // Adjust customer ledger entries if amount changed on UNPAID items as well
        // The total debit entry amount for this manual installment sale should match total.
        const originalTotal = sale.totalAmount;
        if (Math.abs(total - originalTotal) > 0.01 && sale.customerId) {
          const diff = total - originalTotal;
          // Local Store update main DEBIT entry
          const debitEntry = store.accountEntries?.find(
            (e) => e.customerId === sale.customerId && e.type === "DEBIT" && e.description === `${sale.transactionNo} no'lu Manuel Taksitli Satış Borcu`
          );
          if (debitEntry) {
            debitEntry.amount = total;
          }

          // Local Store update POS sale transaction
          const posTrans = store.transactions?.find(
            (t) => t.transactionNo === sale.transactionNo
          );
          if (posTrans) {
            posTrans.totalAmount = total;
          }

          if (!dbDisabled) {
            dbOperations.push(async () => {
              await prisma.accountEntry.updateMany({
                where: {
                  customerId: sale.customerId!,
                  type: "DEBIT",
                  description: `${sale.transactionNo} no'lu Manuel Taksitli Satış Borcu`,
                },
                data: { amount: total },
              });

              await prisma.transaction.updateMany({
                where: { transactionNo: sale.transactionNo },
                data: { totalAmount: total },
              });
            });
          }
        }

        sale.totalAmount = total;
        sale.remainingAmount = remaining;
      }
    }

    // Run database transactions if enabled
    if (!dbDisabled && dbOperations.length > 0) {
      await prisma.$transaction(async () => {
        for (const op of dbOperations) {
          await op();
        }
      });
    }

    // Save local store
    await writeLocalStore(store);

    return ok({ success: true }, 200, "Değişiklikler başarıyla kaydedildi.");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
