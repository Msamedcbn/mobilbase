import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { ok, fail } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  try {
    let branches: Array<{ id: string; name: string }> = [];
    let transactions: Array<{ branchId?: string | null; totalAmount: number; type: string }> = [];

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      branches = store.branches || [];
      transactions = (store.transactions || []).map(t => ({
        branchId: t.branchId,
        totalAmount: Number(t.totalAmount),
        type: t.type
      }));
    } else {
      branches = await prisma.branch.findMany({ select: { id: true, name: true } });
      const dbTransactions = await prisma.transaction.findMany({
        where: { type: "INCOME" },
        select: { branchId: true, totalAmount: true, type: true }
      });
      transactions = dbTransactions.map(t => ({
        branchId: t.branchId,
        totalAmount: Number(t.totalAmount),
        type: t.type
      }));
    }

    // Calculate revenue per branch for INCOME transactions
    const branchRevenues = branches.map(b => {
      const revenue = transactions
        .filter(t => t.branchId === b.id && t.type === "INCOME")
        .reduce((sum, t) => sum + t.totalAmount, 0);
      return {
        id: b.id,
        name: b.name,
        revenue
      };
    });

    const totalRevenue = branchRevenues.reduce((sum, br) => sum + br.revenue, 0);

    const performance = branchRevenues.map(br => ({
      ...br,
      percentage: totalRevenue > 0 ? Math.round((br.revenue / totalRevenue) * 100) : 0
    }));

    return ok({
      performance,
      totalRevenue
    });
  } catch (error) {
    return fail(getErrorMessage(error), "INTERNAL", 500);
  }
}
