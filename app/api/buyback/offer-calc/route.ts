import { z } from "zod";
import { calculateOfferPriceDetailed } from "@/lib/pricing";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";

const schema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  screenCondition: z.enum(["excellent", "good", "bad"]),
  bodyCondition: z.enum(["excellent", "good", "bad"]),
  batteryHealth: z.enum(["above90", "between80_90", "below80"]),
  hasBrokenComponent: z.boolean(),
});

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("Teklif hesaplama verisi gecersiz", "VALIDATION", 400);

    if (isDbDisabledMode()) {
      let price = 20000;
      if (parsed.data.screenCondition === "excellent") price += 2500;
      if (parsed.data.screenCondition === "bad") price -= 3000;
      if (parsed.data.bodyCondition === "excellent") price += 1500;
      if (parsed.data.bodyCondition === "bad") price -= 2000;
      if (parsed.data.batteryHealth === "above90") price += 1000;
      if (parsed.data.batteryHealth === "below80") price -= 1500;
      if (parsed.data.hasBrokenComponent) price -= 3500;
      return ok({ offeredPrice: Math.max(1000, Math.round(price / 50) * 50), mode: "db_disabled" });
    }

    const detailed = await calculateOfferPriceDetailed(parsed.data);
    return ok({ offeredPrice: detailed.offeredPrice, breakdown: detailed });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
