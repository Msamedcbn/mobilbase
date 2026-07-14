import { prisma } from "@/lib/prisma";
import { buybackWizardSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { calculateOfferPriceDetailed } from "@/lib/pricing";
import { fail, ok } from "@/lib/api-response";
import { isBuybackOpsEnabled, requireFeature } from "@/lib/feature-flags";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function POST(req: Request) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = buybackWizardSchema.safeParse(body);
    if (!parsed.success) return fail("Buyback verisi geçersiz", "VALIDATION", 400);

    const tenantId = auth.user?.tenantId ?? null;
    let serverOffer: number;
    let requiresSerial = true;

    if (isDbDisabledMode()) {
      let price = 20000;
      if (parsed.data.screenCondition === "excellent") price += 2500;
      if (parsed.data.screenCondition === "bad") price -= 3000;
      if (parsed.data.bodyCondition === "excellent") price += 1500;
      if (parsed.data.bodyCondition === "bad") price -= 2000;
      if (parsed.data.batteryHealth === "above90") price += 1000;
      if (parsed.data.batteryHealth === "below80") price -= 1500;
      if (parsed.data.hasBrokenComponent) price -= 3500;
      serverOffer = Math.max(1000, Math.round(price / 50) * 50);

      const storeForRule = await readLocalStore();
      const matchedRule = storeForRule.pricingRules.find(
        (r) =>
          r.tenantId === tenantId &&
          r.brand.toLowerCase() === parsed.data.brand.toLowerCase() &&
          r.isActive &&
          (!r.modelPattern || parsed.data.model.toLowerCase().includes(r.modelPattern.toLowerCase()))
      );
      requiresSerial = matchedRule ? Boolean(matchedRule.requiresSerialNumber) : true;
    } else {
      const detailed = await calculateOfferPriceDetailed({
        brand: parsed.data.brand,
        model: parsed.data.model,
        screenCondition: parsed.data.screenCondition,
        bodyCondition: parsed.data.bodyCondition,
        batteryHealth: parsed.data.batteryHealth,
        hasBrokenComponent: parsed.data.hasBrokenComponent,
      }, tenantId);
      serverOffer = detailed.offeredPrice;
      requiresSerial = detailed.requiresSerialNumber;
    }

    const trimmedImei = parsed.data.imei ? parsed.data.imei.trim() : "";
    if (requiresSerial && !trimmedImei) {
      return fail("Bu marka/model icin IMEI numarasi zorunludur.", "VALIDATION", 400);
    }
    if (trimmedImei && (trimmedImei.length < 14 || trimmedImei.length > 16)) {
      return fail("Gecerli bir IMEI numarasi girin (14-16 haneli).", "VALIDATION", 400);
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = store.customers.find((c) => c.id === parsed.data.customerId);
      if (!customer) return fail("Müşteri kaydi bulunamadi", "NOT_FOUND", 404);
      const device = store.devices.find((d) => d.id === parsed.data.deviceId);
      if (!device) return fail("Cihaz kaydi bulunamadi", "NOT_FOUND", 404);
      if (device.customerId !== customer.id) {
        return fail("Cihaz ile müşteri iliskisi tutarsiz", "VALIDATION", 400);
      }
      const duplicate = store.buybacks.find((b) => b.deviceId === device.id && b.status !== "REJECTED");
      if (duplicate) {
        return fail("Bu cihaz icin açık bir buyback kaydi zaten var", "CONFLICT", 409);
      }
      const deal = {
        id: localId("buy"),
        customerId: parsed.data.customerId,
        deviceId: parsed.data.deviceId,
        offeredPrice: serverOffer,
        agreedPrice: null,
        status: "APPROVED" as const,
        reconciliationStatus: "NONE" as const,
        evaluationNote: "Buyback Wizard uzerinden olusturuldu",
      };
      store.buybacks.unshift(deal);
      await writeLocalStore(store);
      return ok({ wizard: { id: localId("wiz") }, product: { id: localId("prd") }, deal }, 201, "Buyback kaydi tamamlandi");
    }

    const fallbackBarcode = `IKINCI-EL-${parsed.data.brand}-${parsed.data.model}-${Date.now()}`
      .toUpperCase()
      .replace(/\s+/g, "-");

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: `${parsed.data.brand} ${parsed.data.model} ${parsed.data.storage}`,
          barcode: trimmedImei || fallbackBarcode,
          category: "SECOND_HAND_DEVICE",
          stock: 1,
          purchasePrice: serverOffer,
          salePrice: serverOffer * 1.2,
        },
      });

      const wizard = await tx.buybackWizardData.create({
        data: {
          customerId: parsed.data.customerId,
          deviceId: parsed.data.deviceId,
          productId: product.id,
          nationalId: parsed.data.nationalId,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          brand: parsed.data.brand,
          model: parsed.data.model,
          storage: parsed.data.storage,
          imei: trimmedImei,
          screenCondition: parsed.data.screenCondition,
          bodyCondition: parsed.data.bodyCondition,
          batteryHealth: parsed.data.batteryHealth,
          hasBrokenComponent: parsed.data.hasBrokenComponent,
          offeredPrice: serverOffer,
        },
      });

      await tx.buybackDeal.create({
        data: {
          customerId: parsed.data.customerId,
          deviceId: parsed.data.deviceId,
          offeredPrice: serverOffer,
          status: "APPROVED",
          evaluationNote: "Buyback Wizard uzerinden olusturuldu",
        },
      });

      return { wizard, product };
    });

    await writeAuditLog({
      action: "BUYBACK_APPROVE",
      entityType: "BuybackWizardData",
      entityId: result.wizard.id,
      actorUserId: auth.user?.userId,
      customerId: parsed.data.customerId,
      detail: `2.el stok karti: ${result.product.id}`,
    });

    return ok(result, 201, "Buyback kaydi tamamlandi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

