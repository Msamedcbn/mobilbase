import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return fail("Urun bulunamadi", "NOT_FOUND", 404);
  return ok(product);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;
  if (auth.user?.role === "CASHIER") {
    return fail("Fiyat/stok degisikligi icin admin yetkisi gerekir", "FORBIDDEN", 403);
  }

  try {
    const body = await req.json();
    const product = await prisma.product.update({ where: { id: params.id }, data: body });
    return ok(product, 200, "Urun guncellendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  await prisma.product.delete({ where: { id: params.id } });
  return ok({ ok: true }, 200, "Urun silindi");
}
