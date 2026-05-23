import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const store = await readLocalStore();
    const configs = store.cardInstallmentConfigs || [];
    return ok(configs);
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

    const store = await readLocalStore();
    store.cardInstallmentConfigs = configs;
    await writeLocalStore(store);

    return ok(configs, 200, "Taksit oranları başarıyla kaydedildi.");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
