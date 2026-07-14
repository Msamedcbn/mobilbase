import { prisma } from "@/lib/prisma";
import { buybackDealCreateSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isBuybackOpsEnabled, requireFeature } from "@/lib/feature-flags";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(req: Request) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;
  const pinBranch = req.headers.get("x-branch-id");
  const pinFirm = req.headers.get("x-firm-id");
  const passPin = (item: any) => {
    if (pinBranch && item.branchId && item.branchId !== pinBranch) return false;
    if (pinFirm && item.firmId && item.firmId !== pinFirm) return false;
    return true;
  };
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const tenantCustomers = store.customers.filter((c) => c.tenantId === auth.user.tenantId).map((c) => c.id);
    const filteredBuybacks = store.buybacks.filter((b) => tenantCustomers.includes(b.customerId));
    const items = filteredBuybacks.map((b: any) => {
      const customer = store.customers.find((c) => c.id === b.customerId);
      const device = store.devices.find((d) => d.id === b.deviceId);
      return {
        ...b,
        offeredPrice: b.offeredPrice.toFixed(2),
        agreedPrice: b.agreedPrice == null ? null : b.agreedPrice.toFixed(2),
        customerId: b.customerId,
        createdAt: b.createdAt ?? new Date().toISOString(),
        branchId: b.branchId ?? null,
        firmId: b.firmId ?? null,
        customer: customer ? { fullName: customer.fullName } : null,
        device: device ? { brand: device.brand, model: device.model, imei: device.imei ?? null } : null,
      };
    });
    return ok(items.filter(passPin));
  }

  try {
    const items = await prisma.buybackDeal.findMany({
      where: {
        customer: {
          tenantId: auth.user.tenantId,
        },
      },
      orderBy: { createdAt: "desc" },
      include: { customer: true, device: true },
    });
    return ok(items.map((item) => ({
      ...item,
      customerId: item.customerId,
      branchId: null,
      firmId: null,
      device: item.device ? { ...item.device, imei: item.device.imei ?? null } : null,
    })).filter(passPin));
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = buybackDealCreateSchema.safeParse(body);
    if (!parsed.success) return fail("Geçersiz buyback verisi", "VALIDATION", 400);
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = store.customers.find((c) => c.id === parsed.data.customerId && c.tenantId === auth.user.tenantId);
      if (!customer) {
        return fail("Müşteri bulunamadı veya yetkisiz", "NOT_FOUND", 404);
      }
      const item = {
        id: localId("buy"),
        customerId: parsed.data.customerId,
        deviceId: parsed.data.deviceId,
        offeredPrice: parsed.data.offeredPrice,
        agreedPrice: parsed.data.agreedPrice ?? null,
        status: parsed.data.status,
        reconciliationStatus: "NONE" as const,
        evaluationNote: parsed.data.evaluationNote ?? null,
      };
      store.buybacks.unshift(item);
      await writeLocalStore(store);
      return ok(item, 201, "Buyback kaydi olusturuldu");
    }

    const customer = await prisma.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId: auth.user.tenantId },
    });
    if (!customer) {
      return fail("Müşteri bulunamadı veya yetkisiz", "NOT_FOUND", 404);
    }

    const item = await prisma.buybackDeal.create({ data: parsed.data });
    await writeAuditLog({
      action: "BUYBACK_CREATE",
      entityType: "BuybackDeal",
      entityId: item.id,
      actorUserId: auth.user?.userId,
      customerId: item.customerId,
      detail: `Status:${item.status}`,
    });

    return ok(item, 201, "Buyback kaydi olusturuldu");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

