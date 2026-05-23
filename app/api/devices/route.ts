import { prisma } from "@/lib/prisma";
import { deviceSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return ok(store.devices.map((d) => ({
      ...d,
      customer: store.customers.find((c) => c.id === d.customerId) ?? null,
    })));
  }
  const items = await prisma.device.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true } });
  return ok(items);
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = deviceSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Device validation failure details:", parsed.error.format(), "Body was:", body);
      return fail("Gecersiz cihaz verisi", "VALIDATION", 400);
    }

    const deviceData = {
      ...parsed.data,
      imei: parsed.data.imei && parsed.data.imei.trim() !== "" ? parsed.data.imei.trim() : null,
    };

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const item = { ...deviceData, id: localId("dev"), color: deviceData.color ?? null, conditionNote: deviceData.conditionNote ?? null, isSecondHandStock: deviceData.isSecondHandStock ?? false };
      store.devices.unshift(item);
      await writeLocalStore(store);
      return ok(item, 201, "Cihaz kaydi basarili");
    }

    const item = await prisma.device.create({ data: deviceData });
    await writeAuditLog({
      action: "DEVICE_CREATE",
      entityType: "Device",
      entityId: item.id,
      actorUserId: auth.user?.userId,
      detail: `${item.brand} ${item.model}`,
    });

    return ok(item, 201, "Cihaz kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}
