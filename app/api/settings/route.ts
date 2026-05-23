import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.settings) {
        store.settings = {
          id: "default",
          whatsappEnabled: false,
          whatsappNumber: null,
          repairTemplate: null,
          veresiyeTemplate: null,
          installmentTemplate: null,
        };
        await writeLocalStore(store);
      }
      return ok(store.settings);
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "default",
          whatsappEnabled: false,
          whatsappNumber: null,
          repairTemplate: null,
          veresiyeTemplate: null,
          installmentTemplate: null,
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
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    const data = {
      whatsappEnabled: typeof body.whatsappEnabled === "boolean" ? body.whatsappEnabled : false,
      whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber).trim() : null,
      repairTemplate: body.repairTemplate ? String(body.repairTemplate) : null,
      veresiyeTemplate: body.veresiyeTemplate ? String(body.veresiyeTemplate) : null,
      installmentTemplate: body.installmentTemplate ? String(body.installmentTemplate) : null,
    };

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      store.settings = {
        id: "default",
        ...data,
      };
      await writeLocalStore(store);
      return ok(store.settings, 200, "Ayarlar başarıyla güncellendi.");
    }

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        ...data,
      },
    });

    await writeAuditLog({
      action: "SETTINGS_UPDATE",
      entityType: "SystemSettings",
      entityId: "default",
      actorUserId: auth.user?.userId,
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
