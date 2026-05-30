import { describe, expect, it } from "vitest";
import { isValidBuybackProcessTransition, validateBuybackSellability } from "../lib/buyback-stock";

describe("buyback stock rules", () => {
  it("allows only expected process transitions", () => {
    expect(isValidBuybackProcessTransition(null, "SERVICE_TRANSFERRED")).toBe(true);
    expect(isValidBuybackProcessTransition("SERVICE_TRANSFERRED", "READY_FOR_SALE")).toBe(true);
    expect(isValidBuybackProcessTransition("READY_FOR_SALE", "SERVICE_TRANSFERRED")).toBe(false);
  });

  it("blocks non-ready or closed buyback items from sale", () => {
    expect(validateBuybackSellability({ isBuybackItem: true, name: "Cihaz", buybackSaleEnabled: false, buybackProcessStatus: "READY_FOR_SALE" })).toContain("satisa kapali");
    expect(validateBuybackSellability({ isBuybackItem: true, name: "Cihaz", buybackSaleEnabled: true, buybackProcessStatus: "SERVICE_TRANSFERRED" })).toContain("satisa hazir degil");
    expect(validateBuybackSellability({ isBuybackItem: true, name: "Cihaz", buybackSaleEnabled: true, buybackProcessStatus: "READY_FOR_SALE" })).toBeNull();
  });
});
