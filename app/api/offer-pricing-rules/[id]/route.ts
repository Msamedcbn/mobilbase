import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const existing = store.pricingRules.find((r) => r.id === params.id);
      if (!existing) return fail("Kural bulunamadi", "NOT_FOUND", 404);
      Object.assign(existing, body);
      await writeLocalStore(store);
      return ok(existing);
    }
    const before = await prisma.offerPricingRule.findUnique({ where: { id: params.id } });
    const rule = await prisma.offerPricingRule.update({ where: { id: params.id }, data: body });
    await writeAuditLog({
      action: "PRICING_RULE_UPDATE",
      entityType: "OfferPricingRule",
      entityId: rule.id,
      actorUserId: auth.user?.userId,
      detail: `base:${before?.basePrice ?? "-"} -> ${rule.basePrice}`,
    });
    return ok(rule);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const idx = store.pricingRules.findIndex((r) => r.id === params.id);
      if (idx === -1) return fail("Kural bulunamadi", "NOT_FOUND", 404);
      store.pricingRules.splice(idx, 1);
      await writeLocalStore(store);
      return ok({ ok: true });
    }
    const existing = await prisma.offerPricingRule.findUnique({ where: { id: params.id } });
    await prisma.offerPricingRule.delete({ where: { id: params.id } });
    await writeAuditLog({
      action: "PRICING_RULE_DELETE",
      entityType: "OfferPricingRule",
      entityId: params.id,
      actorUserId: auth.user?.userId,
      detail: `brand:${existing?.brand ?? "-"} model:${existing?.modelPattern ?? "-"}`,
    });
    return ok({ ok: true });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
