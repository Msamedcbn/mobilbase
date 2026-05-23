import { fail, ok } from "@/lib/api-response";
import { resolveReconciliationByToken } from "@/lib/buyback-ops";
import { isReconciliationEnabled, requireFeature } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const disabled = requireFeature(isReconciliationEnabled(), "Mutabakat modulu pasif");
  if (disabled) return disabled;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const rec = store.reconciliations.find((r) => r.token === params.token);
    if (!rec) return fail("Mutabakat kaydi bulunamadi", "NOT_FOUND", 404);
    if (new Date(rec.tokenExpiresAt).getTime() < Date.now()) return fail("Mutabakat baglantisinin suresi dolmus", "FORBIDDEN", 403);
    if (rec.status === "SENT") {
      rec.status = "VIEWED";
      const deal = store.buybacks.find((b) => b.id === rec.buybackDealId);
      if (deal) deal.reconciliationStatus = "VIEWED";
      await writeLocalStore(store);
    }
    const deal = store.buybacks.find((b) => b.id === rec.buybackDealId);
    const customer = deal ? store.customers.find((c) => c.id === deal.customerId) : null;
    const device = deal ? store.devices.find((d) => d.id === deal.deviceId) : null;
    return ok({
      id: rec.id,
      status: rec.status,
      tokenExpiresAt: new Date(rec.tokenExpiresAt),
      customerPrice: rec.customerPrice,
      companyPrice: rec.companyPrice,
      differenceAmount: rec.differenceAmount,
      customerNote: rec.customerNote,
      buybackDeal: {
        id: deal?.id ?? "-",
        customer: customer ? { fullName: customer.fullName } : null,
        device: device
          ? {
              brand: device.brand,
              model: device.model,
              storage: device.storage,
              imei: device.imei,
              conditionNote: device.conditionNote,
            }
          : null,
      },
    });
  }

  const item = await resolveReconciliationByToken(params.token);
  if (!item) return fail("Mutabakat kaydi bulunamadi", "NOT_FOUND", 404);

  if (item.tokenExpiresAt.getTime() < Date.now()) {
    return fail("Mutabakat baglantisinin suresi dolmus", "FORBIDDEN", 403);
  }

  if (item.status === "SENT" && !item.viewedAt) {
    await prisma.buybackReconciliation.update({
      where: { id: item.id },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    await prisma.buybackDeal.update({
      where: { id: item.buybackDealId },
      data: { reconciliationStatus: "VIEWED" },
    });
    item.status = "VIEWED";
    item.viewedAt = new Date();
  }

  return ok({
    id: item.id,
    status: item.status,
    tokenExpiresAt: item.tokenExpiresAt,
    customerPrice: Number(item.customerPrice),
    companyPrice: Number(item.companyPrice),
    differenceAmount: Number(item.differenceAmount),
    customerNote: item.customerNote,
    buybackDeal: item.buybackDeal,
  });
}
