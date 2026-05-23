import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { processQueuedBuybackNotifications } from "@/lib/buyback-ops";
import { isBuybackOpsEnabled, requireFeature } from "@/lib/feature-flags";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";

export async function POST() {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const result = await processQueuedBuybackNotifications();
    return ok(result, 200, "Bildirim kuyrugu islendi");
  } catch (error) {
    return fail(getErrorMessage(error, "Kuyruk islenemedi"), getErrorCode(error), getErrorStatus(error));
  }
}
