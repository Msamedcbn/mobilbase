import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { resolvePeriod, sumBenefits } from "@/lib/reports";

export async function GET(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

  try {
    const { searchParams } = new URL(req.url);
    const { periodStart, periodEnd } = resolvePeriod(searchParams);

    if (isDbDisabledMode()) {
      // Local-store demo mode doesn't persist per-line sale items (see veri-analizi),
      // so there's no cost/revenue basis to compute commissions from here either.
      const users = await prisma.appUser.findMany({ where: { tenantId } as any });
      return ok({
        periodStart: periodStart?.toISOString() ?? null,
        periodEnd: periodEnd.toISOString(),
        dbUnavailable: true,
        staff: users.map((u) => ({
          userId: u.id,
          fullName: u.fullName,
          role: u.role,
          baseSalary: 0,
          commissionBasis: "NONE",
          commissionPct: 0,
          benefits: [],
          benefitsAmount: 0,
          salesCount: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          commissionAmount: 0,
          totalPayout: 0,
          alreadyPosted: false,
        })),
      });
    }

    const users = await prisma.appUser.findMany({
      where: { tenantId } as any,
      select: {
        id: true,
        fullName: true,
        role: true,
        baseSalary: true,
        commissionBasis: true,
        commissionPct: true,
        benefits: true,
      },
    });

    const items = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          type: "INCOME",
          tenantId,
          soldByUserId: { not: null },
          ...(periodStart ? { createdAt: { gte: periodStart, lte: periodEnd } } : { createdAt: { lte: periodEnd } }),
        },
      },
      select: {
        transactionId: true,
        quantity: true,
        lineTotal: true,
        unitCost: true,
        product: { select: { purchasePrice: true } },
        transaction: { select: { soldByUserId: true } },
      },
    });

    const byStaff = new Map<string, { revenue: number; cost: number; saleIds: Set<string> }>();
    for (const it of items) {
      const staffId = it.transaction.soldByUserId!;
      const unitCost = Number(it.unitCost) > 0 ? Number(it.unitCost) : Number(it.product?.purchasePrice ?? 0);
      const entry = byStaff.get(staffId) ?? { revenue: 0, cost: 0, saleIds: new Set<string>() };
      entry.revenue += Number(it.lineTotal);
      entry.cost += it.quantity * unitCost;
      entry.saleIds.add(it.transactionId);
      byStaff.set(staffId, entry);
    }

    const existingPayouts = periodStart
      ? await prisma.staffPayoutRecord.findMany({
          where: { tenantId, periodStart, periodEnd },
          select: { appUserId: true },
        })
      : [];
    const postedUserIds = new Set(existingPayouts.map((p) => p.appUserId));

    const staff = users.map((u) => {
      const agg = byStaff.get(u.id);
      const revenue = agg?.revenue ?? 0;
      const cost = agg?.cost ?? 0;
      const profit = revenue - cost;
      const commissionPct = Number(u.commissionPct);
      const commissionAmount =
        u.commissionBasis === "PROFIT" ? profit * (commissionPct / 100) : u.commissionBasis === "REVENUE" ? revenue * (commissionPct / 100) : 0;
      const benefitsAmount = sumBenefits(u.benefits);
      const totalPayout = Number(u.baseSalary) + commissionAmount + benefitsAmount;
      return {
        userId: u.id,
        fullName: u.fullName,
        role: u.role,
        baseSalary: Number(u.baseSalary),
        commissionBasis: u.commissionBasis,
        commissionPct,
        benefits: Array.isArray(u.benefits) ? u.benefits : [],
        benefitsAmount,
        salesCount: agg?.saleIds.size ?? 0,
        revenue,
        cost,
        profit,
        commissionAmount,
        totalPayout,
        alreadyPosted: postedUserIds.has(u.id),
      };
    });

    return ok({
      periodStart: periodStart?.toISOString() ?? null,
      periodEnd: periodEnd.toISOString(),
      dbUnavailable: false,
      staff,
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

