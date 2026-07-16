import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, LocalStore } from "@/lib/local-store";
import { productUpdateSchema } from "@/lib/validations";

function stockItemToProduct(item: LocalStore["stockItems"][number], variants: LocalStore["productVariants"]) {
  return {
    id: item.id,
    name: item.name,
    barcode: item.sku,
    category: item.category,
    brand: item.brand || null,
    model: item.model || null,
    variantColor: item.variantColor || null,
    variantStorage: item.variantStorage || null,
    stock: item.quantity,
    purchasePrice: Number(item.purchasePrice).toFixed(2),
    salePrice: Number(item.salePrice).toFixed(2),
    dealerPrice: item.dealerPrice != null ? Number(item.dealerPrice).toFixed(2) : null,
    wholesalePrice: item.wholesalePrice != null ? Number(item.wholesalePrice).toFixed(2) : null,
    images: item.images || [],
    isCatalog: item.isCatalog || false,
    condition: item.condition || null,
    variants,
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER", "ACCOUNTANT"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.stockItems || []).find((s) => s.id === params.id && s.tenantId === tenantId);
    if (!item) return fail("Urun bulunamadi", "NOT_FOUND", 404);
    const variants = (store.productVariants || []).filter((v) => v.productId === params.id);
    return ok(stockItemToProduct(item, variants));
  }

  const product = await prisma.product.findFirst({
    where: { id: params.id, tenantId },
    include: { variants: true },
  });
  if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);
  return ok(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  if (auth.user?.role === "CASHIER") {
    return fail("Fiyat/stok degisikligi icin admin yetkisi gerekir", "FORBIDDEN", 403);
  }

  let data: ReturnType<typeof productUpdateSchema.parse>;
  try {
    data = productUpdateSchema.parse(await req.json());
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.stockItems || []).find((s) => s.id === params.id && s.tenantId === tenantId);
    if (!item) return fail("Urun bulunamadi", "NOT_FOUND", 404);
    if (data.name !== undefined) item.name = data.name;
    if (data.category !== undefined) item.category = data.category ?? item.category;
    if (data.brand !== undefined) item.brand = data.brand;
    if (data.model !== undefined) item.model = data.model;
    if (data.variantColor !== undefined) item.variantColor = data.variantColor;
    if (data.variantStorage !== undefined) item.variantStorage = data.variantStorage;
    if (data.condition !== undefined) item.condition = data.condition;
    if (data.purchasePrice !== undefined) item.purchasePrice = data.purchasePrice;
    if (data.salePrice !== undefined) item.salePrice = data.salePrice;
    if (data.dealerPrice !== undefined) item.dealerPrice = data.dealerPrice;
    if (data.wholesalePrice !== undefined) item.wholesalePrice = data.wholesalePrice;
    if (data.images !== undefined) item.images = data.images;
    item.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    const variants = (store.productVariants || []).filter((v) => v.productId === params.id);
    return ok(stockItemToProduct(item, variants), 200, "Urun guncellendi");
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) return fail("Urun bulunamadi", "NOT_FOUND", 404);

    const { images, ...rest } = data;
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(images !== undefined ? { images: images === null ? Prisma.JsonNull : images } : {}),
      },
    });
    return ok(product, 200, "Urun guncellendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const exists = (store.stockItems || []).some((s) => s.id === params.id && s.tenantId === tenantId);
    if (!exists) return fail("Urun bulunamadi", "NOT_FOUND", 404);
    store.stockItems = (store.stockItems || []).filter((s) => s.id !== params.id);
    store.productVariants = (store.productVariants || []).filter((v) => v.productId !== params.id);
    await writeLocalStore(store);
    return ok({ ok: true }, 200, "Urun silindi");
  }

  const existing = await prisma.product.findFirst({
    where: { id: params.id, tenantId },
  });
  if (!existing) return fail("Urun bulunamadi", "NOT_FOUND", 404);

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return ok({ ok: true }, 200, "Urun silindi");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      await prisma.$transaction([
        prisma.product.update({ where: { id: params.id }, data: { isActive: false } }),
        prisma.stockItem.updateMany({
          where: { sku: existing.barcode, tenantId },
          data: { isActive: false },
        }),
      ]);
      return ok({ ok: true, archived: true }, 200, "Bu urun satis gecmisinde kullanildigi icin tamamen silinemedi; envanterden kaldirildi (arsivlendi).");
    }
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
