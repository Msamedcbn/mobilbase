import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

type OfferInput = {
  brand: string;
  model: string;
  screenCondition: "excellent" | "good" | "bad";
  bodyCondition: "excellent" | "good" | "bad";
  batteryHealth: "above90" | "between80_90" | "below80";
  hasBrokenComponent: boolean;
};

export async function calculateOfferPriceDetailed(input: OfferInput) {
  let rule: any = null;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    rule = store.pricingRules.find(
      (r) =>
        r.brand.toLowerCase() === input.brand.toLowerCase() &&
        r.isActive &&
        (!r.modelPattern || input.model.toLowerCase().includes(r.modelPattern.toLowerCase()))
    );
  } else {
    rule = await prisma.offerPricingRule.findFirst({
      where: {
        brand: input.brand,
        isActive: true,
        OR: [{ modelPattern: null }, { modelPattern: { contains: input.model, mode: "insensitive" } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const base = Number(rule?.basePrice ?? 10000);
  const excellentBonus = Number(rule?.excellentBonusPct ?? 0.2);
  const goodBonus = Number(rule?.goodBonusPct ?? 0);
  const badPenalty = Number(rule?.badPenaltyPct ?? 0.2);
  const batteryHigh = Number(rule?.batteryHighPct ?? 0.08);
  const batteryLowPenalty = Number(rule?.batteryLowPenalty ?? 0.18);
  const brokenPenalty = Number(rule?.brokenPenaltyPct ?? 0.3);
  const minPrice = rule && rule.minPrice != null ? Number(rule.minPrice) : 0;
  const maxPrice = rule && rule.maxPrice != null ? Number(rule.maxPrice) : base * 1.5;

  let price = base;
  const lines: Array<{ field: string; multiplier: number; note: string }> = [];

  if (input.screenCondition === "excellent") {
    price *= 1 + excellentBonus;
    lines.push({ field: "screenCondition", multiplier: 1 + excellentBonus, note: "Ekran mukemmel bonusu" });
  }
  if (input.screenCondition === "good") {
    price *= 1 + goodBonus;
    lines.push({ field: "screenCondition", multiplier: 1 + goodBonus, note: "Ekran iyi bonusu" });
  }
  if (input.screenCondition === "bad") {
    price *= 1 - badPenalty;
    lines.push({ field: "screenCondition", multiplier: 1 - badPenalty, note: "Ekran hasar cezasi" });
  }

  if (input.bodyCondition === "excellent") {
    price *= 1 + excellentBonus;
    lines.push({ field: "bodyCondition", multiplier: 1 + excellentBonus, note: "Kasa mukemmel bonusu" });
  }
  if (input.bodyCondition === "good") {
    price *= 1 + goodBonus;
    lines.push({ field: "bodyCondition", multiplier: 1 + goodBonus, note: "Kasa iyi bonusu" });
  }
  if (input.bodyCondition === "bad") {
    price *= 1 - badPenalty;
    lines.push({ field: "bodyCondition", multiplier: 1 - badPenalty, note: "Kasa hasar cezasi" });
  }

  if (input.batteryHealth === "above90") {
    price *= 1 + batteryHigh;
    lines.push({ field: "batteryHealth", multiplier: 1 + batteryHigh, note: "Pil sagligi yuksek bonusu" });
  }
  if (input.batteryHealth === "below80") {
    price *= 1 - batteryLowPenalty;
    lines.push({ field: "batteryHealth", multiplier: 1 - batteryLowPenalty, note: "Pil sagligi dusuk cezasi" });
  }

  if (input.hasBrokenComponent) {
    price *= 1 - brokenPenalty;
    lines.push({ field: "hasBrokenComponent", multiplier: 1 - brokenPenalty, note: "Arizali parca cezasi" });
  }

  let offeredPrice = Math.round(price / 50) * 50;

  if (minPrice > 0 && offeredPrice < minPrice) {
    offeredPrice = minPrice;
    lines.push({ field: "minPriceLimit", multiplier: 1, note: `Min fiyat limitine ulasildi (Min: ${minPrice} TL)` });
  }
  if (maxPrice > 0 && offeredPrice > maxPrice) {
    offeredPrice = maxPrice;
    lines.push({ field: "maxPriceLimit", multiplier: 1, note: `Max fiyat limitine ulasildi (Max: ${maxPrice} TL)` });
  }

  return {
    offeredPrice,
    basePrice: base,
    minPrice: minPrice || null,
    maxPrice: maxPrice || null,
    ruleId: rule?.id ?? null,
    lines,
  };
}

export async function calculateOfferPrice(input: OfferInput) {
  const result = await calculateOfferPriceDetailed(input);
  return result.offeredPrice;
}
