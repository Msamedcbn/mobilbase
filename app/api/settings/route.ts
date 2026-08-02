import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = (await getEffectiveTenantId(auth.user)) || "default";

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.settings) {
        store.settings = {
          id: tenantId,
          whatsappEnabled: false,
          whatsappNumber: null,
          repairTemplate: null,
          veresiyeTemplate: null,
          installmentTemplate: null,
          expenseTypes: ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"],
        };
        await writeLocalStore(store);
      }
      if (!store.settings.expenseTypes || store.settings.expenseTypes.length === 0) {
        store.settings.expenseTypes = ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"];
        await writeLocalStore(store);
      }
      return ok(store.settings);
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: tenantId },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: tenantId,
          whatsappEnabled: false,
          whatsappNumber: null,
          repairTemplate: null,
          veresiyeTemplate: null,
          installmentTemplate: null,
          expenseTypes: ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"],
        },
      });
    }

    return ok(settings);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Sistem ayarları alınamadı.",
      "INTERNAL",
      500
    );
  }
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = (await getEffectiveTenantId(auth.user)) || "default";

  try {
    const body = await req.json();

    const data = {
      whatsappEnabled: typeof body.whatsappEnabled === "boolean" ? body.whatsappEnabled : false,
      whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber).trim() : null,
      repairTemplate: body.repairTemplate ? String(body.repairTemplate) : null,
      veresiyeTemplate: body.veresiyeTemplate ? String(body.veresiyeTemplate) : null,
      installmentTemplate: body.installmentTemplate ? String(body.installmentTemplate) : null,
      expenseTypes: Array.isArray(body.expenseTypes)
        ? body.expenseTypes.map((x: unknown) => String(x).trim()).filter(Boolean)
        : ["Kira", "Fatura", "Maas", "Mal Alimi", "Diger"],
    };

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      store.settings = {
        id: tenantId,
        ...data,
      };
      await writeLocalStore(store);
      return ok(store.settings, 200, "Ayarlar başarıyla güncellendi.");
    }

    const updated = await prisma.systemSettings.upsert({
      where: { id: tenantId },
      update: data,
      create: {
        id: tenantId,
        ...data,
      },
    });

    await writeAuditLog({
      action: "SETTINGS_UPDATE",
      entityType: "SystemSettings",
      entityId: tenantId,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      detail: "Sistem ve WhatsApp bildirim ayarları güncellendi.",
    });

    return ok(updated, 200, "Ayarlar başarıyla güncellendi.");
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Ayarlar güncellenirken hata oluştu.",
      "INTERNAL",
      500
    );
  }
}
