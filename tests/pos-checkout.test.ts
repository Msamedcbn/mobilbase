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

  it("rejects checkout without a customer", () => {
    const result = posCheckoutSchema.safeParse({
      paymentMethod: "CASH",
      items: [{ productId: "p1", quantity: 1, unitPrice: 100, discountPct: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects checkout with neither paymentMethod nor payments", () => {
    const result = posCheckoutSchema.safeParse({
      customerId: "cus_1",
      items: [{ productId: "p1", quantity: 1, unitPrice: 100, discountPct: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a split-payment payments[] array", () => {
    const result = posCheckoutSchema.safeParse({
      customerId: "cus_1",
      items: [{ productId: "p1", quantity: 1, unitPrice: 25000, discountPct: 0 }],
      payments: [
        { method: "CASH", amount: 10000 },
        { method: "CREDIT_CARD", amount: 15000, bankAccountId: "bank_1" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
