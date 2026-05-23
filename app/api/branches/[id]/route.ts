import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const branch = store.branches?.find((b) => b.id === params.id);
    if (!branch) return fail("Şube bulunamadı", "NOT_FOUND", 404);
    return ok(branch);
  }

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
    });
    if (!branch) return fail("Şube bulunamadı", "NOT_FOUND", 404);
    return ok(branch);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, address, phone } = body;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const branchIndex = store.branches?.findIndex((b) => b.id === params.id) ?? -1;
      if (branchIndex === -1 || !store.branches) {
        return fail("Şube bulunamadı", "NOT_FOUND", 404);
      }

      if (name) {
        const duplicate = store.branches.some((b) => b.id !== params.id && b.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          return fail("Bu şube adı zaten kayıtlı", "CONFLICT", 409);
        }
        store.branches[branchIndex].name = name;
      }
      if (address !== undefined) store.branches[branchIndex].address = address;
      if (phone !== undefined) store.branches[branchIndex].phone = phone;

      await writeLocalStore(store);
      return ok(store.branches[branchIndex], 200, "Şube başarıyla güncellendi");
    }

    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: { name, address, phone },
    });
    return ok(branch, 200, "Şube başarıyla güncellendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const branchIndex = store.branches?.findIndex((b) => b.id === params.id) ?? -1;
      if (branchIndex === -1 || !store.branches) {
        return fail("Şube bulunamadı", "NOT_FOUND", 404);
      }

      // Check if there is any stock in this branch in the local store
      const hasStock = store.productBranchStocks?.some((s) => s.branchId === params.id && s.stock > 0);
      if (hasStock) {
        return fail("Stoğu bulunan şube silinemez. Önce stokları transfer edin.", "VALIDATION", 400);
      }

      store.branches.splice(branchIndex, 1);
      if (store.productBranchStocks) {
        store.productBranchStocks = store.productBranchStocks.filter((s) => s.branchId !== params.id);
      }

      await writeLocalStore(store);
      return ok({ success: true }, 200, "Şube başarıyla silindi");
    }

    // Check if there is any active stock in this branch in database
    const stockCount = await prisma.productBranchStock.count({
      where: { branchId: params.id, stock: { gt: 0 } },
    });
    if (stockCount > 0) {
      return fail("Stoğu bulunan şube silinemez. Önce stokları transfer edin.", "VALIDATION", 400);
    }

    await prisma.branch.delete({
      where: { id: params.id },
    });
    return ok({ success: true }, 200, "Şube başarıyla silindi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
