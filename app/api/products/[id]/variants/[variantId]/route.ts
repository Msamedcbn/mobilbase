import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { productVariantUpdateSchema } from "@/lib/validations";

export async function PUT(req: Request, { params }: { params: { id: string; variantId: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  if (auth.user?.role === "CASHIER") {
    return fail("Fiyat/stok degisikligi icin admin yetkisi gerekir", "FORBIDDEN", 403);
  }

  let data: ReturnType<typeof productVariantUpdateSchema.parse>;
  try {
    data = productVariantUpdateSchema.parse(await req.json());
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const variant = (store.productVariants || []).find((v) => v.id === params.variantId && v.productId === params.id && v.tenantId === tenantId);
    if (!variant) return fail("Varyant bulunamadi", "NOT_FOUND", 404);
    if (data.size !== undefined) variant.size = data.size;
    if (data.color !== undefined) variant.color = data.color;
    if (data.stock !== undefined) variant.stock = data.stock;
    if (data.purchasePrice !== undefined) variant.purchasePrice = data.purchasePrice;
    if (data.salePrice !== undefined) variant.salePrice = data.salePrice;
    variant.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    return ok(variant, 200, "Varyant guncellendi");
  }

  const existing = await prisma.productVariant.findFirst({ where: { id: params.variantId, productId: params.id, tenantId } });
  if (!existing) return fail("Varyant bulunamadi", "NOT_FOUND", 404);

  const variant = await prisma.productVariant.update({
    where: { id: params.variantId },
    data,
  });
  return ok(variant, 200, "Varyant guncellendi");
}

export async function DELETE(_: Request, { params }: { params: { id: string; variantId: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const exists = (store.productVariants || []).some((v) => v.id === params.variantId && v.productId === params.id && v.tenantId === tenantId);
    if (!exists) return fail("Varyant bulunamadi", "NOT_FOUND", 404);
    store.productVariants = (store.productVariants || []).filter((v) => v.id !== params.variantId);
    await writeLocalStore(store);
    return ok({ ok: true }, 200, "Varyant silindi");
  }

  const existing = await prisma.productVariant.findFirst({ where: { id: params.variantId, productId: params.id, tenantId } });
  if (!existing) return fail("Varyant bulunamadi", "NOT_FOUND", 404);

  await prisma.productVariant.delete({ where: { id: params.variantId } });
  return ok({ ok: true }, 200, "Varyant silindi");
}
