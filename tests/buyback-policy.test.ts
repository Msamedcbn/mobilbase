import { describe, expect, it } from "vitest";
import { isValidBuybackStatusTransition } from "../lib/buyback-policy";

describe("Buyback status transitions", () => {
  it("allows draft to approved", () => {
    expect(isValidBuybackStatusTransition("DRAFT", "APPROVED")).toBe(true);
  });

  it("rejects completed to draft", () => {
    expect(isValidBuybackStatusTransition("COMPLETED", "DRAFT")).toBe(false);
  });
});
