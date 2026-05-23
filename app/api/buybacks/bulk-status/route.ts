import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isBuybackOpsEnabled, requireFeature } from "@/lib/feature-flags";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { z } from "zod";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(["DRAFT", "APPROVED", "REJECTED", "COMPLETED"]),
});

export async function POST(req: Request) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Toplu guncelleme verisi gecersiz", "VALIDATION", 400);
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      let updatedCount = 0;
      for (const item of store.buybacks) {
        if (parsed.data.ids.includes(item.id)) {
          item.status = parsed.data.status;
          updatedCount++;
        }
      }
      await writeLocalStore(store);
      return ok({ updatedCount }, 200, "Toplu durum guncellendi");
    }

    const result = await prisma.buybackDeal.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { status: parsed.data.status },
    });

    await writeAuditLog({
      action: "BUYBACK_BULK_STATUS_UPDATE",
      entityType: "BuybackDeal",
      actorUserId: auth.user?.userId,
      detail: `Count:${result.count} Status:${parsed.data.status}`,
    });

    return ok({ updatedCount: result.count }, 200, "Toplu durum guncellendi");
  } catch (error) {
    return fail(getErrorMessage(error, "Toplu guncelleme hatasi"), getErrorCode(error), getErrorStatus(error));
  }
}
