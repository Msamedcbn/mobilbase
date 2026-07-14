import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;
  if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

  const bankId = params.id;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const bank = (store.bankAccounts || []).find((b) => b.id === bankId && b.tenantId === tenantId);
      if (!bank) return fail("Banka hesabı bulunamadı", "NOT_FOUND", 404);

      const transactions = (store.transactions || [])
        .filter((t) => t.bankAccountId === bankId)
        .map((t) => {
          const customer = store.customers.find((c) => c.id === t.customerId);
          return {
            id: t.id,
            date: t.createdAt,
            type: t.type === "INCOME" ? "INCOME" : "OUTFLOW",
            description: `${t.transactionNo} - POS Satışı ${customer ? `(${customer.fullName})` : ""}`,
            amount: Number(t.totalAmount),
            source: "POS",
          };
        });

      const entries = (store.accountEntries || [])
        .filter((e) => e.bankAccountId === bankId)
        .map((e) => {
          const customer = store.customers.find((c) => c.id === e.customerId);
          return {
            id: e.id,
            date: e.createdAt,
            type: e.type === "CREDIT" ? "INCOME" : "OUTFLOW",
            description: `${e.description || "Cari Hesap Hareketi"} ${customer ? `(${customer.fullName})` : ""}`,
            amount: Number(e.amount),
            source: "CARI",
          };
        });

      const buybacks = (store.buybacks || [])
        .filter((b) => b.bankAccountId === bankId && b.status === "COMPLETED")
        .map((b) => {
          const customer = store.customers.find((c) => c.id === b.customerId);
          const device = store.devices.find((d) => d.id === b.deviceId);
          return {
            id: b.id,
            date: b.updatedAt || b.createdAt || new Date().toISOString(),
            type: "OUTFLOW",
            description: `Geri Alım Ödemesi - ${device ? `${device.brand} ${device.model}` : "Cihaz"} ${customer ? `(${customer.fullName})` : ""}`,
            amount: Number(b.agreedPrice || b.offeredPrice),
            source: "BUYBACK",
          };
        });

      const logs = [...transactions, ...entries, ...buybacks].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return ok(logs);
    }

    const bank = await prisma.bankAccount.findFirst({ where: { id: bankId, tenantId } });
    if (!bank) return fail("Banka hesabı bulunamadı", "NOT_FOUND", 404);

    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: bankId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    const entries = await prisma.accountEntry.findMany({
      where: { bankAccountId: bankId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });

    const buybacks = await prisma.buybackDeal.findMany({
      where: { bankAccountId: bankId, status: "COMPLETED" },
      include: { customer: true, device: true },
      orderBy: { updatedAt: "desc" },
    });

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      date: t.createdAt.toISOString(),
      type: t.type === "INCOME" ? "INCOME" : "OUTFLOW",
      description: `${t.transactionNo} - POS Satışı ${t.customer ? `(${t.customer.fullName})` : ""}`,
      amount: Number(t.totalAmount),
      source: "POS",
    }));

    const formattedEntries = entries.map((e) => ({
      id: e.id,
      date: e.createdAt.toISOString(),
      type: e.type === "CREDIT" ? "INCOME" : "OUTFLOW",
      description: `${e.description || "Cari Hesap Hareketi"} ${e.customer ? `(${e.customer.fullName})` : ""}`,
      amount: Number(e.amount),
      source: "CARI",
    }));

    const formattedBuybacks = buybacks.map((b) => ({
      id: b.id,
      date: (b.updatedAt || b.createdAt).toISOString(),
      type: "OUTFLOW",
      description: `Geri Alım Ödemesi - ${b.device ? `${b.device.brand} ${b.device.model}` : "Cihaz"} ${b.customer ? `(${b.customer.fullName})` : ""}`,
      amount: Number(b.agreedPrice || b.offeredPrice),
      source: "BUYBACK",
    }));

    const logs = [...formattedTransactions, ...formattedEntries, ...formattedBuybacks].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return ok(logs);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
