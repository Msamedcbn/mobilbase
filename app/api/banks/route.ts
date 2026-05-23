import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return ok(store.bankAccounts || []);
  }

  try {
    const banks = await prisma.bankAccount.findMany({ orderBy: { name: "asc" } });
    return ok(banks);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, iban, balance } = body;
    if (!name) {
      return fail("Banka/Kasa adı zorunludur", "VALIDATION", 400);
    }

    const initBalance = Number(balance || 0);

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.bankAccounts) store.bankAccounts = [];

      const exists = store.bankAccounts.some((b) => b.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return fail("Bu banka/kasa adı zaten kayıtlı", "CONFLICT", 409);
      }

      const newBank = {
        id: localId("bank"),
        name,
        iban: iban || null,
        balance: initBalance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.bankAccounts.push(newBank);
      await writeLocalStore(store);
      return ok(newBank, 201, "Banka/Kasa hesabı başarıyla oluşturuldu");
    }

    const bank = await prisma.bankAccount.create({
      data: { name, iban, balance: initBalance },
    });
    return ok(bank, 201, "Banka/Kasa hesabı başarıyla oluşturuldu");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
