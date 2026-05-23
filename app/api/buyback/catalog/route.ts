import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      return ok({ items: (store.buybackCatalog || []).filter((x) => x.category === "telefon") });
    }

    const rules = await prisma.offerPricingRule.findMany({
      where: { isActive: true },
      orderBy: [{ brand: "asc" }, { modelPattern: "asc" }],
    });
    return ok({
      items: rules.map((r) => ({
        id: r.id,
        category: "telefon",
        brand: r.brand,
        model: r.modelPattern ?? "",
        basePrice: Number(r.basePrice),
        minPrice: r.minPrice == null ? 0 : Number(r.minPrice),
        questionSetJson: "",
      })),
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

