import { fail, ok } from "@/lib/api-response";
import { reconciliationDecisionSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { resolveReconciliationByToken } from "@/lib/buyback-ops";
import { isReconciliationEnabled, requireFeature } from "@/lib/feature-flags";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const disabled = requireFeature(isReconciliationEnabled(), "Mutabakat modulu pasif");
  if (disabled) return disabled;
  if (isDbDisabledMode()) {
    const body = await req.json();
    const parsed = reconciliationDecisionSchema.safeParse(body);
    if (!parsed.success) return fail("Karar verisi gecersiz", "VALIDATION", 400);
    const store = await readLocalStore();
    const rec = store.reconciliations.find((r) => r.token === params.token);
    if (!rec) return fail("Mutabakat kaydi bulunamadi", "NOT_FOUND", 404);
    if (new Date(rec.tokenExpiresAt).getTime() < Date.now()) return fail("Mutabakat baglantisinin suresi dolmus", "FORBIDDEN", 403);
    if (rec.status === "APPROVED" || rec.status === "REJECTED") return fail("Mutabakat zaten sonuclanmis", "CONFLICT", 409);
    rec.status = parsed.data.decision;
    rec.customerNote = parsed.data.note ?? null;
    const deal = store.buybacks.find((b) => b.id === rec.buybackDealId);
    if (deal) {
      deal.reconciliationStatus = parsed.data.decision;
      if (parsed.data.decision === "APPROVED") deal.status = "APPROVED";
    }
    await writeLocalStore(store);
    return ok({ decision: parsed.data.decision }, 200, "Mutabakat karari kaydedildi");
  }

  const item = await resolveReconciliationByToken(params.token);
  if (!item) return fail("Mutabakat kaydi bulunamadi", "NOT_FOUND", 404);
  if (item.tokenExpiresAt.getTime() < Date.now()) return fail("Mutabakat baglantisinin suresi dolmus", "FORBIDDEN", 403);
  if (item.status === "APPROVED" || item.status === "REJECTED") return fail("Mutabakat zaten sonuclanmis", "CONFLICT", 409);

  const body = await req.json();
  const parsed = reconciliationDecisionSchema.safeParse(body);
  if (!parsed.success) return fail("Karar verisi gecersiz", "VALIDATION", 400);

  const status = parsed.data.decision;

  await prisma.$transaction(async (tx) => {
    await tx.buybackReconciliation.update({
      where: { id: item.id },
      data: {
        status,
        customerNote: parsed.data.note ?? null,
        decidedAt: new Date(),
        viewedAt: item.viewedAt ?? new Date(),
      },
    });

    await tx.buybackDeal.update({
      where: { id: item.buybackDealId },
      data: {
        reconciliationStatus: status,
        status: status === "APPROVED" ? "APPROVED" : item.buybackDeal.status,
      },
    });
  });

  return ok({ decision: status }, 200, "Mutabakat karari kaydedildi");
}
