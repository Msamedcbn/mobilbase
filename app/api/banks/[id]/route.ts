import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, iban, balance } = body;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.bankAccounts) store.bankAccounts = [];

      const bankIndex = store.bankAccounts.findIndex((b) => b.id === params.id);
      if (bankIndex === -1) {
        return fail("Banka/Kasa hesabı bulunamadı", "NOT_FOUND", 404);
      }

      if (name) {
        const nameConflict = store.bankAccounts.some(
          (b) => b.id !== params.id && b.name.toLowerCase() === name.toLowerCase()
        );
        if (nameConflict) {
          return fail("Bu banka/kasa adı zaten kayıtlı", "CONFLICT", 409);
        }
        store.bankAccounts[bankIndex].name = name;
      }

      if (iban !== undefined) {
        store.bankAccounts[bankIndex].iban = iban || null;
      }

      if (balance !== undefined) {
        store.bankAccounts[bankIndex].balance = Number(balance);
      }

      await writeLocalStore(store);
      return ok(store.bankAccounts[bankIndex], 200, "Banka/Kasa hesabı başarıyla güncellendi");
    }

    const data: any = {};
    if (name) data.name = name;
    if (iban !== undefined) data.iban = iban || null;
    if (balance !== undefined) data.balance = Number(balance);

    const bank = await prisma.bankAccount.update({
      where: { id: params.id },
      data,
    });
    return ok(bank, 200, "Banka/Kasa hesabı başarıyla güncellendi");
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
      if (!store.bankAccounts) store.bankAccounts = [];

      const bankIndex = store.bankAccounts.findIndex((b) => b.id === params.id);
      if (bankIndex === -1) {
        return fail("Banka/Kasa hesabı bulunamadı", "NOT_FOUND", 404);
      }

      store.bankAccounts.splice(bankIndex, 1);
      await writeLocalStore(store);
      return ok({ success: true }, 200, "Banka/Kasa hesabı başarıyla silindi");
    }

    await prisma.bankAccount.delete({
      where: { id: params.id },
    });
    return ok({ success: true }, 200, "Banka/Kasa hesabı başarıyla silindi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
