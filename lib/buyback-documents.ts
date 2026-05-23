import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import type { BuybackPdfPayload } from "@/lib/buyback-pdf";

export async function getBuybackPdfPayloadByDealId(dealId: string): Promise<BuybackPdfPayload | null> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const deal = store.buybacks.find((b) => b.id === dealId);
    if (!deal) return null;
    const customer = store.customers.find((c) => c.id === deal.customerId);
    const device = store.devices.find((d) => d.id === deal.deviceId);
    return {
      dealId: deal.id,
      customerName: customer?.fullName ?? "-",
      customerPhone: customer?.phone ?? "-",
      customerNationalId: customer?.nationalId ?? "-",
      deviceBrand: device?.brand ?? "-",
      deviceModel: device?.model ?? "-",
      deviceImei: device?.imei ?? "-",
      offeredPrice: Number(deal.offeredPrice ?? 0),
      agreedPrice: deal.agreedPrice == null ? null : Number(deal.agreedPrice),
    };
  }

  const deal = await prisma.buybackDeal.findUnique({
    where: { id: dealId },
    include: { customer: true, device: true },
  });
  if (!deal) return null;
  return {
    dealId: deal.id,
    customerName: deal.customer?.fullName ?? "-",
    customerPhone: deal.customer?.phone ?? "-",
    customerNationalId: deal.customer?.nationalId ?? "-",
    deviceBrand: deal.device?.brand ?? "-",
    deviceModel: deal.device?.model ?? "-",
    deviceImei: deal.device?.imei ?? "-",
    offeredPrice: Number(deal.offeredPrice ?? 0),
    agreedPrice: deal.agreedPrice == null ? null : Number(deal.agreedPrice),
  };
}

