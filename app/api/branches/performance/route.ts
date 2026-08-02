import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { ok, fail } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/errors";
import { getSessionUser, getEffectiveTenantId } from "@/lib/auth";

export async function GET(req: Request) {
  const user = getSessionUser();
  if (!user) return fail("Oturum bulunamadı", "UNAUTHORIZED", 401);
  const tenantId = await getEffectiveTenantId(user);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const periodStart = from ? new Date(`${from}T00:00:00`) : null;
  const periodEnd = from ? (to ? new Date(`${to}T23:59:59.999`) : new Date()) : null;

  try {
    let branches: Array<{ id: string; name: string }> = [];
    let transactions: Array<{ branchId?: string | null; totalAmount: number; type: string }> = [];

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      branches = (store.branches || []).filter((b) => b.tenantId === tenantId);
      transactions = (store.transactions || [])
        .filter((t) => t.tenantId === tenantId)
        .filter((t) => !periodStart || (new Date(t.createdAt) >= periodStart && new Date(t.createdAt) <= periodEnd!))
        .map(t => ({
          branchId: t.branchId,
          totalAmount: Number(t.totalAmount),
          type: t.type
        }));
    } else {
      branches = await prisma.branch.findMany({ where: { tenantId }, select: { id: true, name: true } });
      const dbTransactions = await prisma.transaction.findMany({
        where: {
          type: "INCOME",
          tenantId,
          ...(periodStart ? { createdAt: { gte: periodStart, lte: periodEnd! } } : {}),
        },
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

    // Income transactions with no branchId (e.g. a POS sale made without a branch
    // selected) must still count toward total revenue — otherwise this total silently
    // undercounts vs. the dashboard's tenant-wide monthlyIncome, which sums ALL income
    // transactions regardless of branchId. Surface them as an explicit bucket instead
    // of dropping them, so the numbers reconcile and nothing looks like it vanished.
    const unassignedRevenue = transactions
      .filter(t => !t.branchId && t.type === "INCOME")
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const allRevenues = unassignedRevenue > 0
      ? [...branchRevenues, { id: "unassigned", name: "Atanmamış (Şubesiz)", revenue: unassignedRevenue }]
      : branchRevenues;

    const totalRevenue = allRevenues.reduce((sum, br) => sum + br.revenue, 0);

    const performance = allRevenues.map(br => ({
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
