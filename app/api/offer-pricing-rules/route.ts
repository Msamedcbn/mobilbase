import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { writeAuditLog } from "@/lib/audit";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return ok(store.pricingRules.filter((x) => x.tenantId === tenantId).map((x) => ({
      ...x,
      basePrice: x.basePrice.toFixed(2),
      excellentBonusPct: x.excellentBonusPct.toFixed(2),
      goodBonusPct: x.goodBonusPct.toFixed(2),
      badPenaltyPct: x.badPenaltyPct.toFixed(2),
      batteryHighPct: x.batteryHighPct.toFixed(2),
      batteryLowPenalty: x.batteryLowPenalty.toFixed(2),
      brokenPenaltyPct: x.brokenPenaltyPct.toFixed(2),
    })));
  }
  try {
    const rules = await prisma.offerPricingRule.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    return ok(rules);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;
  if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);
  try {
    const body = await req.json();
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const rule = { id: localId("rule"), ...body, tenantId };
      store.pricingRules.unshift(rule);
      await writeLocalStore(store);
      return ok(rule, 201);
    }
    const rule = await prisma.offerPricingRule.create({ data: { ...body, tenantId } });
    await writeAuditLog({
      action: "PRICING_RULE_CREATE",
      entityType: "OfferPricingRule",
      entityId: rule.id,
      actorUserId: auth.user?.userId,
      detail: `brand:${rule.brand} model:${rule.modelPattern ?? "-"}`,
    });
    return ok(rule, 201);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
