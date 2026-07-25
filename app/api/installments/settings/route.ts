import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

/**
 * Card installment rates are tenant-scoped settings, stored on the tenant's
 * SystemSettings row (whose id is the tenantId).
 *
 * They previously lived only in the process-local JSON store, which meant every
 * tenant on the platform shared one rate table and the values were lost on each
 * serverless cold start. POS reads these rates, so both were production bugs.
 */

function settingsKey(tenantId: string | null | undefined) {
  return tenantId || "default";
}

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      return ok(store.cardInstallmentConfigs || []);
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: settingsKey(auth.user.tenantId) },
      select: { cardInstallmentConfigs: true },
    });

    const configs = settings?.cardInstallmentConfigs;
    return ok(Array.isArray(configs) ? configs : []);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return fail("Geçersiz veri formatı. Ayarlar listesi gönderilmelidir.", "VALIDATION", 400);
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      store.cardInstallmentConfigs = configs;
      await writeLocalStore(store);
      return ok(configs, 200, "Taksit oranları başarıyla kaydedildi.");
    }

    const key = settingsKey(auth.user.tenantId);
    await prisma.systemSettings.upsert({
      where: { id: key },
      update: { cardInstallmentConfigs: configs },
      create: {
        id: key,
        cardInstallmentConfigs: configs,
        expenseTypes: ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"],
      },
    });

    return ok(configs, 200, "Taksit oranları başarıyla kaydedildi.");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
