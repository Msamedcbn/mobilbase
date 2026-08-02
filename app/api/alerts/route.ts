import { prisma } from "@/lib/prisma";
import { getSessionUser, getEffectiveTenantId } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/errors";
import { readLocalStore } from "@/lib/local-store";

export type CriticalStockAlert = {
  type: "CRITICAL_STOCK";
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minThreshold: number;
};

export type OverdueInstallmentAlert = {
  type: "OVERDUE_INSTALLMENT";
  id: string;
  saleTransactionNo: string;
  customerName: string | null;
  installmentNo: number;
  amount: number;
  dueDate: string;
};

export type OverdueCreditAlert = {
  type: "OVERDUE_CREDIT";
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  dueDate: string;
};

export type AlertsResponse = {
  criticalStock: CriticalStockAlert[];
  overdueInstallments: OverdueInstallmentAlert[];
  overdueCredit: OverdueCreditAlert[];
};

// Aggregates the handful of "you should look at this" conditions that used to
// require opening three different screens to notice: stock that's about to
// run out, installment payments past their due date, and veresiye customers
// whose overdue balance hasn't been collected.
export async function GET() {
  const user = getSessionUser();
  if (!user) return fail("Oturum bulunamadı", "UNAUTHORIZED", 401);
  const tenantId = await getEffectiveTenantId(user);

  try {
    const now = new Date();

    const stockItems = await prisma.stockItem.findMany({
      where: {
        tenantId,
        isCatalog: false,
        isActive: true,
        minThreshold: { gt: 0 },
      },
      select: { id: true, name: true, sku: true, quantity: true, minThreshold: true },
    });
    const criticalStock: CriticalStockAlert[] = stockItems
      .filter((s) => s.quantity <= s.minThreshold)
      .map((s) => ({ type: "CRITICAL_STOCK", id: s.id, name: s.name, sku: s.sku, quantity: s.quantity, minThreshold: s.minThreshold }));

    // Installments live in the local JSON store regardless of DB mode (see
    // app/api/installments/route.ts) — this endpoint reads the same source so
    // the two screens never disagree about what's overdue.
    const store = await readLocalStore();
    const overdueInstallments: OverdueInstallmentAlert[] = [];
    for (const sale of store.installmentSales || []) {
      if (sale.tenantId !== tenantId) continue;
      const customer = sale.customerId ? store.customers.find((c) => c.id === sale.customerId) : null;
      for (const inst of sale.installments || []) {
        if (inst.status === "UNPAID" && new Date(inst.dueDate) < now) {
          overdueInstallments.push({
            type: "OVERDUE_INSTALLMENT",
            id: inst.id,
            saleTransactionNo: sale.transactionNo,
            customerName: customer?.fullName ?? null,
            installmentNo: inst.installmentNo,
            amount: inst.amount,
            dueDate: inst.dueDate,
          });
        }
      }
    }
    overdueInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // A customer's overdue veresiye balance: any DEBIT entry past its due date,
    // rolled up to the customer's current net balance (DEBIT - CREDIT) so a
    // since-paid entry doesn't still show as owing.
    const overdueDebits = await prisma.accountEntry.findMany({
      where: {
        customer: { tenantId },
        type: "DEBIT",
        dueDate: { lt: now },
      },
      select: { customerId: true, dueDate: true, customer: { select: { fullName: true } } },
    });
    const earliestDueByCustomer = new Map<string, { name: string; dueDate: Date }>();
    for (const d of overdueDebits) {
      const existing = earliestDueByCustomer.get(d.customerId);
      if (!existing || (d.dueDate && d.dueDate < existing.dueDate)) {
        earliestDueByCustomer.set(d.customerId, { name: d.customer.fullName, dueDate: d.dueDate! });
      }
    }

    const overdueCredit: OverdueCreditAlert[] = [];
    for (const [customerId, info] of earliestDueByCustomer) {
      const entries = await prisma.accountEntry.findMany({
        where: { customerId },
        select: { type: true, amount: true },
      });
      const balance = entries.reduce((sum, e) => sum + (e.type === "DEBIT" ? Number(e.amount) : -Number(e.amount)), 0);
      if (balance > 0) {
        overdueCredit.push({
          type: "OVERDUE_CREDIT",
          id: customerId,
          customerId,
          customerName: info.name,
          balance,
          dueDate: info.dueDate.toISOString(),
        });
      }
    }
    overdueCredit.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const response: AlertsResponse = { criticalStock, overdueInstallments, overdueCredit };
    return ok(response);
  } catch (error) {
    return fail(getErrorMessage(error), "INTERNAL", 500);
  }
}
