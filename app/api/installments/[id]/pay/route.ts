import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { withLocalStoreLock, localId } from "@/lib/local-store";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId || null;

  const saleId = params.id;

  try {
    const body = await req.json();
    const { installmentId, bankAccountId } = body;

    if (!installmentId || !bankAccountId) {
      return fail("installmentId ve bankAccountId parametreleri zorunludur.", "VALIDATION", 400);
    }

    // The whole check-then-act (is it already paid? then mark paid + move money) runs
    // inside a single lock so two concurrent requests for the same installment (double
    // click, retry) can't both pass the "not yet paid" check and both credit the bank.
    return await withLocalStoreLock(async (store) => {
    const saleIndex = store.installmentSales?.findIndex((s) => s.id === saleId && s.tenantId === tenantId) ?? -1;

    if (saleIndex === -1 || !store.installmentSales) {
      return fail("Taksit planı bulunamadı.", "NOT_FOUND", 404);
    }

    const sale = store.installmentSales[saleIndex];
    const installment = sale.installments.find((inst) => inst.id === installmentId);

    if (!installment) {
      return fail("Taksit bulunamadı.", "NOT_FOUND", 404);
    }

    if (installment.status === "PAID") {
      return fail("Bu taksit zaten ödenmiş.", "VALIDATION", 400);
    }

    const amountToPay = installment.amount;

    if (isDbDisabledMode()) {
      const bank = store.bankAccounts?.find((b) => b.id === bankAccountId && b.tenantId === tenantId);
      if (!bank) {
        return fail("Seçilen banka/kasa hesabı bulunamadı.", "NOT_FOUND", 404);
      }

      // 1. Update installment status
      installment.status = "PAID";
      installment.paidAt = new Date().toISOString();
      installment.bankAccountId = bankAccountId;

      // 2. Decrement remaining amount
      sale.remainingAmount = Math.max(0, Math.round((sale.remainingAmount - amountToPay) * 100) / 100);

      // 3. Increment bank account balance
      bank.balance = Number(bank.balance) + amountToPay;

      // 4. Create CREDIT entry to reduce customer veresiye balance
      if (sale.customerId) {
        if (!store.accountEntries) store.accountEntries = [];
        store.accountEntries.push({
          id: localId("entry"),
          customerId: sale.customerId,
          type: "CREDIT",
          amount: amountToPay,
          description: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
          createdAt: new Date().toISOString(),
          bankAccountId,
        });
      }

      // 5. Create System Income Transaction
      const transId = localId("tr");
      const transactionNo = `POS-COLL-${Date.now()}`;
      if (!store.transactions) store.transactions = [];
      store.transactions.unshift({
        id: transId,
        transactionNo,
        tenantId,
        type: "INCOME" as const,
        paymentMethod: bankAccountId === "bank-nakit" ? "CASH" : "CREDIT_CARD",
        customerId: sale.customerId || null,
        totalAmount: amountToPay,
        note: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
        createdAt: new Date().toISOString(),
        bankAccountId,
      });

      return ok({ success: true, remainingAmount: sale.remainingAmount });
    } else {
      // DB Enabled Mode
      const bank = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, tenantId },
      });
      if (!bank) {
        return fail("Seçilen banka/kasa hesabı bulunamadı.", "NOT_FOUND", 404);
      }

      // Update local store state first (since we manage installment sales schedule there)
      installment.status = "PAID";
      installment.paidAt = new Date().toISOString();
      installment.bankAccountId = bankAccountId;
      sale.remainingAmount = Math.max(0, Math.round((sale.remainingAmount - amountToPay) * 100) / 100);

      const transactionNo = `POS-COLL-${Date.now()}`;

      // Run DB transaction
      await prisma.$transaction(async (tx) => {
        // Increment bank balance
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { increment: amountToPay } },
        });

        // Create CREDIT entry for customer account if customer is specified
        if (sale.customerId) {
          await tx.accountEntry.create({
            data: {
              customerId: sale.customerId,
              type: "CREDIT",
              amount: amountToPay,
              description: `${sale.transactionNo} no'lu Taksit Ödemesi (Taksit #${installment.installmentNo})`,
              bankAccountId,
            },
          });
        }

        // Create system Income transaction
        await tx.transaction.create({
          data: {
            transactionNo,
            tenantId,
            type: "INCOME",
            paymentMethod: bankAccountId === "bank-nakit" ? "CASH" : "CREDIT_CARD",
            customerId: sale.customerId || null,
            totalAmount: amountToPay,
            note: `Taksit Tahsilatı - ${sale.transactionNo} (Taksit #${installment.installmentNo})`,
            bankAccountId,
          },
        });
      });

      return ok({ success: true, remainingAmount: sale.remainingAmount });
    }
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
