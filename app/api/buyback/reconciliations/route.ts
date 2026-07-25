import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { reconciliationCreateSchema } from "@/lib/validations";
import { createReconciliationToken, enqueueReconciliationNotifications, getTokenHash } from "@/lib/buyback-ops";
import { isReconciliationEnabled, requireFeature } from "@/lib/feature-flags";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function POST(req: Request) {
  const disabled = requireFeature(isReconciliationEnabled(), "Mutabakat modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = reconciliationCreateSchema.safeParse(body);
    if (!parsed.success) return fail("Mutabakat verisi geçersiz", "VALIDATION", 400);
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const deal = store.buybacks.find((b) => b.id === parsed.data.buybackDealId);
      if (!deal) return fail("Buyback kaydi bulunamadi", "NOT_FOUND", 404);
      const existingOpen = store.reconciliations.find(
        (r) => r.buybackDealId === deal.id && (r.status === "SENT" || r.status === "VIEWED"),
      );
      if (existingOpen) return fail("Bu teklif icin açık mutabakat zaten var", "CONFLICT", 409);
      const rawToken = createReconciliationToken();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
      const diff = Number(parsed.data.companyPrice) - Number(parsed.data.customerPrice);
      const reconciliation = {
        id: localId("rec"),
        token: rawToken,
        buybackDealId: deal.id,
        customerPrice: Number(parsed.data.customerPrice),
        companyPrice: Number(parsed.data.companyPrice),
        differenceAmount: diff,
        status: "SENT" as const,
        tokenExpiresAt: expiresAt.toISOString(),
        customerNote: null,
      };
      store.reconciliations.unshift(reconciliation);
      deal.reconciliationStatus = "SENT";
      await writeLocalStore(store);
      const reconciliationLink = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/buyback/reconciliation/${rawToken}`;
      await enqueueReconciliationNotifications({
        buybackDealId: deal.id,
        customerEmail: parsed.data.customerEmail ?? store.customers.find((c) => c.id === deal.customerId)?.email ?? null,
        reconciliationLink,
        offerIdLabel: deal.id,
      });
      return ok({ reconciliationId: reconciliation.id, tokenExpiresAt: expiresAt, reconciliationLink }, 201, "Mutabakat olusturuldu");
    }

    // BuybackDeal carries its tenant through customer.tenantId — looking it up by
    // bare id let an admin of one tenant open a reconciliation (and trigger the
    // customer-facing email) against another tenant's deal.
    const deal = await prisma.buybackDeal.findFirst({
      where: {
        id: parsed.data.buybackDealId,
        customer: { tenantId: auth.user.tenantId ?? null },
      },
      include: { customer: true },
    });
    if (!deal) return fail("Buyback kaydi bulunamadi", "NOT_FOUND", 404);

    const rawToken = createReconciliationToken();
    const tokenHash = getTokenHash(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const diff = Number(parsed.data.companyPrice) - Number(parsed.data.customerPrice);

    const reconciliation = await prisma.buybackReconciliation.create({
      data: {
        buybackDealId: deal.id,
        customerPrice: parsed.data.customerPrice,
        companyPrice: parsed.data.companyPrice,
        differenceAmount: diff,
        customerAnswers: parsed.data.customerAnswers ? JSON.stringify(parsed.data.customerAnswers) : null,
        companyAnswers: parsed.data.companyAnswers ? JSON.stringify(parsed.data.companyAnswers) : null,
        diffItems: parsed.data.diffItems ? JSON.stringify(parsed.data.diffItems) : null,
        tokenHash,
        tokenExpiresAt: expiresAt,
        status: "SENT",
        createdByUserId: auth.user?.userId,
      },
    });

    await prisma.buybackDeal.update({
      where: { id: deal.id },
      data: { reconciliationStatus: "SENT" },
    });

    const reconciliationLink = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/buyback/reconciliation/${rawToken}`;
    await enqueueReconciliationNotifications({
      buybackDealId: deal.id,
      customerEmail: parsed.data.customerEmail ?? deal.customer?.email ?? null,
      reconciliationLink,
      offerIdLabel: deal.id,
    });

    await writeAuditLog({
      action: "BUYBACK_RECONCILIATION_CREATE",
      entityType: "BuybackReconciliation",
      entityId: reconciliation.id,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      customerId: deal.customerId,
      detail: `deal:${deal.id}`,
    });

    return ok(
      {
        reconciliationId: reconciliation.id,
        tokenExpiresAt: reconciliation.tokenExpiresAt,
        reconciliationLink,
      },
      201,
      "Mutabakat olusturuldu",
    );
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

