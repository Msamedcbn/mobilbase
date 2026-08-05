import { describe, expect, it } from "vitest";
import { findPriceMismatch, resolveBranchPrice } from "../lib/pos-pricing";

describe("resolveBranchPrice", () => {
  it("falls back to the general sale price when there is no branch override", () => {
    expect(resolveBranchPrice(500, null)).toBe(500);
    expect(resolveBranchPrice(500, undefined)).toBe(500);
  });

  it("prefers the branch override when one is set", () => {
    expect(resolveBranchPrice(500, 450)).toBe(450);
  });

  it("accepts Decimal-as-string values from Prisma", () => {
    expect(resolveBranchPrice("500.00", "450.00")).toBe(450);
    expect(resolveBranchPrice("500.00", null)).toBe(500);
  });

  it("treats a zero override as a real price, not as missing", () => {
    expect(resolveBranchPrice(500, 0)).toBe(0);
  });

  it("ignores an unparseable override rather than returning NaN", () => {
    expect(resolveBranchPrice(500, "bozuk")).toBe(500);
  });
});

describe("findPriceMismatch", () => {
  const prices = new Map<string, number>([
    ["p1", 249],
    ["p2", 450],
  ]);

  it("passes when every line matches the authoritative price", () => {
    const result = findPriceMismatch(
      [
        { productId: "p1", unitPrice: 249 },
        { productId: "p2", unitPrice: 450 },
      ],
      prices,
    );
    expect(result).toBeNull();
  });

  it("rejects a tampered price — the case this guard exists for", () => {
    const result = findPriceMismatch([{ productId: "p1", unitPrice: 1 }], prices);
    expect(result).toEqual({ kind: "price-changed", productId: "p1", expected: 249, received: 1 });
  });

  it("rejects the general price when a branch override applies", () => {
    // p2's authoritative price is the 450 branch override; 500 is the general
    // price and must not be accepted while that branch is selected.
    const result = findPriceMismatch([{ productId: "p2", unitPrice: 500 }], prices);
    expect(result).toMatchObject({ kind: "price-changed", expected: 450 });
  });

  it("fails closed for a product missing from the price map", () => {
    const result = findPriceMismatch([{ productId: "ghost", unitPrice: 100 }], prices);
    expect(result).toEqual({ kind: "unknown-product", productId: "ghost" });
  });

  it("tolerates sub-kurus float drift", () => {
    const result = findPriceMismatch([{ productId: "p1", unitPrice: 249.004 }], prices);
    expect(result).toBeNull();
  });

  it("reports the first offending line when several are wrong", () => {
    const result = findPriceMismatch(
      [
        { productId: "p1", unitPrice: 249 },
        { productId: "p2", unitPrice: 5 },
      ],
      prices,
    );
    expect(result).toMatchObject({ productId: "p2" });
  });
});
