export type BuybackProcessStatus = "SERVICE_TRANSFERRED" | "READY_FOR_SALE";

export type BuybackSellabilityInput = {
  name?: string | null;
  isBuybackItem?: boolean | null;
  buybackSaleEnabled?: boolean | null;
  buybackProcessStatus?: BuybackProcessStatus | null;
};

export function isValidBuybackProcessTransition(
  current: BuybackProcessStatus | null | undefined,
  next: BuybackProcessStatus,
) {
  if (!current) return next === "SERVICE_TRANSFERRED";
  if (current === next) return true;
  if (current === "SERVICE_TRANSFERRED" && next === "READY_FOR_SALE") return true;
  return false;
}

export function validateBuybackSellability(input: BuybackSellabilityInput | undefined | null): string | null {
  if (!input) return null;
  if (!input.isBuybackItem) return null;
  const name = input.name || "Buyback cihaz";
  if (!input.buybackSaleEnabled) return `${name} satisa kapali. Once Satisa Ac yapin.`;
  if (input.buybackProcessStatus !== "READY_FOR_SALE") return `${name} henuz satisa hazir degil.`;
  return null;
}
