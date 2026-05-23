import { describe, expect, it } from "vitest";

function calculate(base: number, excellent: boolean) {
  return Math.round((excellent ? base * 1.2 : base) / 50) * 50;
}

describe("Buyback offer calculation baseline", () => {
  it("applies excellent bonus", () => {
    expect(calculate(28000, true)).toBe(33600);
  });

  it("keeps base when no bonus", () => {
    expect(calculate(28000, false)).toBe(28000);
  });
});
