import { prisma } from "@/lib/prisma";
import { deviceSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { requireRole, getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { NextResponse } from "next/server";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const tenantCustomers = store.customers.filter((c) => c.tenantId === tenantId).map((c) => c.id);
    const filteredDevices = store.devices.filter((d) => tenantCustomers.includes(d.customerId));
    return ok(filteredDevices.map((d) => ({
      ...d,
      customer: store.customers.find((c) => c.id === d.customerId) ?? null,
    })));
  }

  const items = await prisma.device.findMany({
    where: {
      customer: {
        tenantId,
      },
    },
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });
  return ok(items);
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const parsed = deviceSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Device validation failure details:", parsed.error.format(), "Body was:", body);
      return fail("Geçersiz cihaz verisi", "VALIDATION", 400);
    }

    const deviceData = {
      ...parsed.data,
      imei: parsed.data.imei && parsed.data.imei.trim() !== "" ? parsed.data.imei.trim() : null,
    };

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = store.customers.find((c) => c.id === deviceData.customerId && c.tenantId === tenantId);
      if (!customer) {
        return fail("Müşteri bulunamadı veya yetkisiz", "NOT_FOUND", 404);
      }
      const item = { ...deviceData, id: localId("dev"), color: deviceData.color ?? null, conditionNote: deviceData.conditionNote ?? null, isSecondHandStock: deviceData.isSecondHandStock ?? false };
      store.devices.unshift(item);
      await writeLocalStore(store);
      return ok(item, 201, "Cihaz kaydi basarili");
    }

    // Verify customer ownership in DB mode
    const customer = await prisma.customer.findFirst({
      where: { id: deviceData.customerId, tenantId },
    });
    if (!customer) {
      return fail("Müşteri bulunamadı veya yetkisiz", "NOT_FOUND", 404);
    }

    const item = await prisma.device.create({ data: deviceData });
    await writeAuditLog({
      action: "DEVICE_CREATE",
      entityType: "Device",
      entityId: item.id,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      detail: `${item.brand} ${item.model}`,
    });

    return ok(item, 201, "Cihaz kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

