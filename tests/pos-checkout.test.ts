import { describe, expect, it } from "vitest";
import { posCheckoutSchema } from "../lib/validations";

describe("POS checkout validation", () => {
  it("rejects empty cart", () => {
    const result = posCheckoutSchema.safeParse({ items: [], paymentMethod: "CASH" });
    expect(result.success).toBe(false);
  });

  it("accepts on-account with customer", () => {
    const result = posCheckoutSchema.safeParse({
      paymentMethod: "ON_ACCOUNT",
      customerId: "cus_1",
      items: [{ productId: "p1", quantity: 1, unitPrice: 100, discountPct: 10 }],
    });
    expect(result.success).toBe(true);
  });
});
