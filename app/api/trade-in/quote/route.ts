import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { tradeInQuoteSchema } from "@/lib/validations";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { prisma } from "@/lib/prisma";

const demoProducts = [
  { id: "demo-prod-1", name: "Type-C Hizli Sarj Adaptoru", salePrice: 1299 },
  { id: "demo-prod-2", name: "Temperli Cam", salePrice: 499 },
];

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = tradeInQuoteSchema.safeParse(body);
    if (!parsed.success) return fail("Takas teklif verisi gecersiz", "VALIDATION", 400);

    const { buybackCredit, productId, quantity } = parsed.data;
    let salePrice = 0;
    let productName = "";

    if (isDbDisabledMode()) {
      const product = demoProducts.find((p) => p.id === productId);
      if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);
      salePrice = product.salePrice;
      productName = product.name;
    } else {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);
      salePrice = Number(product.salePrice);
      productName = product.name;
    }

    const grossAmount = salePrice * quantity;
    const differenceAmount = Math.max(0, grossAmount - buybackCredit);

    return ok({
      productId,
      productName,
      quantity,
      unitPrice: salePrice,
      grossAmount,
      buybackCredit,
      differenceAmount,
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

