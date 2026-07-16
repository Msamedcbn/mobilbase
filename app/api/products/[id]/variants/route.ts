import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";
import { productVariantSchema } from "@/lib/validations";

function cleanBarcodePart(str: string): string {
  return (str || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const variants = (store.productVariants || []).filter((v) => v.productId === params.id && v.tenantId === tenantId);
    return ok(variants);
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId: params.id, tenantId },
    orderBy: { createdAt: "asc" },
  });
  return ok(variants);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  let data: ReturnType<typeof productVariantSchema.parse>;
  try {
    data = productVariantSchema.parse(await req.json());
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const product = (store.stockItems || []).find((s) => s.id === params.id && s.tenantId === tenantId);
    if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);

    const barcode = data.barcode?.trim() || `${product.sku}-${cleanBarcodePart(data.size || "")}-${cleanBarcodePart(data.color || "")}`.replace(/-+/g, "-").replace(/-+$/, "");
    if (!store.productVariants) store.productVariants = [];
    if (store.productVariants.some((v) => v.barcode === barcode && v.tenantId === tenantId)) {
      return fail("Bu barkod zaten kayitli.", "VALIDATION", 400);
    }

    const variant = {
      id: localId("variant"),
      productId: params.id,
      tenantId,
      size: data.size ?? null,
      color: data.color ?? null,
      barcode,
      stock: data.stock,
      purchasePrice: data.purchasePrice ?? null,
      salePrice: data.salePrice ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.productVariants.push(variant);
    await writeLocalStore(store);
    return ok(variant, 201, "Varyant eklendi");
  }

  const product = await prisma.product.findFirst({ where: { id: params.id, tenantId } });
  if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);

  const barcode = data.barcode?.trim() || `${product.barcode}-${cleanBarcodePart(data.size || "")}-${cleanBarcodePart(data.color || "")}`.replace(/-+/g, "-").replace(/-+$/, "");

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId: params.id,
        tenantId,
        size: data.size,
        color: data.color,
        barcode,
        stock: data.stock,
        purchasePrice: data.purchasePrice,
        salePrice: data.salePrice,
      },
    });
    return ok(variant, 201, "Varyant eklendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
