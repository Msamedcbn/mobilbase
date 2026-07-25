import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { resolvePeriod, sumBenefits } from "@/lib/reports";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

  if (isDbDisabledMode()) {
    return fail("Bu islem gercek veritabani gerektirir", "VALIDATION", 400);
  }

  try {
    const body = await req.json();
    const userId = typeof body?.userId === "string" ? body.userId : null;
    if (!userId) return fail("Personel secimi gereklidir", "VALIDATION", 400);

    const usp = new URLSearchParams();
    if (body.period) usp.set("period", String(body.period));
    if (body.from) usp.set("from", String(body.from));
    if (body.to) usp.set("to", String(body.to));
    const { periodStart, periodEnd } = resolvePeriod(usp);

    if (!periodStart) {
      return fail("Hakediş işlemek için belirli bir dönem seçin (Tüm Zamanlar seçilemez)", "VALIDATION", 400);
    }

    const staffUser = await prisma.appUser.findFirst({
      where: { id: userId, tenantId } as any,
    });
    if (!staffUser) return fail("Personel bulunamadi", "NOT_FOUND", 404);

    const effectiveTenantId = tenantId;


    const existing = await prisma.staffPayoutRecord.findFirst({
      where: { appUserId: userId, periodStart, periodEnd },
    });
    if (existing) return fail("Bu dönem için hakediş zaten cariye işlenmiş", "CONFLICT", 409);

    const cari = await prisma.customer.findFirst({
      where: { tenantId: effectiveTenantId, email: { equals: staffUser.email, mode: "insensitive" } },
    });
    if (!cari) {
      return fail("Bu personel için önce Personel Yönetimi ekranından cari hesap oluşturun", "VALIDATION", 400);
    }

    const items = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          type: "INCOME",
          tenantId: effectiveTenantId,
          soldByUserId: userId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      },
      select: {
        quantity: true,
        lineTotal: true,
        unitCost: true,
        product: { select: { purchasePrice: true } },
      },
    });

    const revenue = items.reduce((sum, it) => sum + Number(it.lineTotal), 0);
    const cost = items.reduce((sum, it) => {
      const unitCost = Number(it.unitCost) > 0 ? Number(it.unitCost) : Number(it.product?.purchasePrice ?? 0);
      return sum + it.quantity * unitCost;
    }, 0);
    const profit = revenue - cost;
    const commissionPct = Number(staffUser.commissionPct);
    const commissionAmount =
      staffUser.commissionBasis === "PROFIT"
        ? profit * (commissionPct / 100)
        : staffUser.commissionBasis === "REVENUE"
        ? revenue * (commissionPct / 100)
        : 0;
    const baseSalary = Number(staffUser.baseSalary);
    const benefitsAmount = sumBenefits(staffUser.benefits);
    const totalPayout = baseSalary + commissionAmount + benefitsAmount;

    const periodLabel = `${periodStart.toLocaleDateString("tr-TR")} – ${periodEnd.toLocaleDateString("tr-TR")}`;
    const benefitsLabel = benefitsAmount > 0 ? ` + Ek Haklar: ${benefitsAmount.toLocaleString("tr-TR")} TL` : "";

    const result = await prisma.$transaction(async (tx) => {
      const accountEntry = await tx.accountEntry.create({
        data: {
          customerId: cari.id,
          type: "CREDIT",
          amount: totalPayout,
          description: `Hakediş ${periodLabel} (Sabit: ${baseSalary.toLocaleString("tr-TR")} TL + Prim: ${commissionAmount.toLocaleString("tr-TR")} TL${benefitsLabel})`,
        },
      });

      const payoutRecord = await tx.staffPayoutRecord.create({
        data: {
          appUserId: userId,
          periodStart,
          periodEnd,
          revenue,
          profit,
          baseSalary,
          commissionAmount,
          benefitsAmount,
          totalPayout,
          accountEntryId: accountEntry.id,
          createdByUserId: auth.user?.userId,
          tenantId: effectiveTenantId,
        },
      });

      return { accountEntry, payoutRecord };
    });

    await writeAuditLog({
      action: "STAFF_PAYOUT_POSTED",
      entityType: "StaffPayoutRecord",
      entityId: result.payoutRecord.id,
      actorUserId: auth.user?.userId,
      tenantId,
      customerId: cari.id,
      detail: `${staffUser.fullName} / ${periodLabel} / ${totalPayout.toLocaleString("tr-TR")} TL`,
    });

    return ok(
      {
        payoutRecordId: result.payoutRecord.id,
        accountEntryId: result.accountEntry.id,
        totalPayout,
      },
      201,
      "Hakediş cari hesaba işlendi",
    );
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
