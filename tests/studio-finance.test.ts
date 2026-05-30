import { describe, expect, it } from "vitest";
import { computeLicenseAmount, makeRenewalSuggestion, normalizeLedgerEntry, summarizeLedger } from "../lib/studio-finance";

const pricing = {
  Lite: 750,
  Service: 990,
  Pro: 1500,
  Enterprise: 3500,
  freeBranchLimit: 5,
  branchSurchargePrice: 150,
  addons: { annualDiscountPct: 15 },
};

describe("studio-finance", () => {
  it("computes plan + extra branch + annual discount", () => {
    const result = computeLicenseAmount({
      plan: "Pro",
      branchLimit: 8,
      durationMonths: 12,
      pricing,
      applyAnnualDiscount: true,
    });
    expect(result.baseMonthly).toBe(1500);
    expect(result.extraBranchCount).toBe(3);
    expect(result.extraBranchMonthly).toBe(450);
    expect(result.gross).toBe((1500 + 450) * 12);
    expect(result.discountPct).toBe(15);
    expect(result.net).toBe(Math.round(result.gross * 0.85));
  });

  it("normalizes ledger entries with required fields", () => {
    const entry = normalizeLedgerEntry({
      type: "CHARGE",
      category: "LICENSE",
      amount: 1000,
      description: "Test",
      date: "2026-05-01",
    });
    expect(entry.status).toBe("UNPAID");
    expect(entry.referenceNo).toBeTruthy();
    expect(entry.sourceModule).toBe("MANUAL");
  });

  it("summarizes overdue and due buckets", () => {
    const rows = [
      normalizeLedgerEntry({ type: "CHARGE", amount: 1200, category: "LICENSE", description: "A", date: "2026-05-01", dueDate: "2026-05-10" }),
      normalizeLedgerEntry({ type: "CHARGE", amount: 800, category: "SUPPORT", description: "B", date: "2026-05-20", dueDate: "2026-05-28" }),
      normalizeLedgerEntry({ type: "COLLECTION", amount: 500, category: "LICENSE", description: "C", date: "2026-05-21" }),
    ];
    const summary = summarizeLedger(rows, new Date("2026-05-27T00:00:00.000Z"));
    expect(summary.totalCharges).toBe(2000);
    expect(summary.totalCollections).toBe(500);
    expect(summary.netBalance).toBe(1500);
    expect(summary.overdueAmount).toBe(1200);
    expect(summary.dueIn7Amount).toBe(800);
  });

  it("creates renewal suggestion for near-expiry license", () => {
    const suggestion = makeRenewalSuggestion({
      tenantName: "Demo",
      plan: "Service",
      branchLimit: 3,
      licenseEnd: "2026-06-10",
      pricing,
      today: new Date("2026-05-27T00:00:00.000Z"),
    });
    expect(suggestion.shouldSuggest).toBe(true);
    expect(suggestion.suggestedAmount).toBeGreaterThan(0);
  });

  it("license renewal -> charge entry -> KPI chain works", () => {
    const suggestion = makeRenewalSuggestion({
      tenantName: "Chain Demo",
      plan: "Pro",
      branchLimit: 6,
      licenseEnd: "2026-06-05",
      pricing,
      today: new Date("2026-05-27T00:00:00.000Z"),
    });
    expect(suggestion.shouldSuggest).toBe(true);

    const ledger = [
      normalizeLedgerEntry({
        type: "CHARGE",
        category: "LICENSE",
        amount: suggestion.suggestedAmount,
        description: suggestion.description,
        date: "2026-05-27",
        dueDate: "2026-06-03",
        status: "UNPAID",
      }),
    ];
    const before = summarizeLedger(ledger, new Date("2026-05-27T00:00:00.000Z"));
    expect(before.totalCharges).toBe(suggestion.suggestedAmount);
    expect(before.totalCollections).toBe(0);
    expect(before.netBalance).toBe(suggestion.suggestedAmount);

    ledger.push(
      normalizeLedgerEntry({
        type: "COLLECTION",
        category: "LICENSE",
        amount: suggestion.suggestedAmount,
        description: "Tahsilat",
        date: "2026-05-28",
      }),
    );
    const after = summarizeLedger(ledger, new Date("2026-05-29T00:00:00.000Z"));
    expect(after.totalCharges).toBe(suggestion.suggestedAmount);
    expect(after.totalCollections).toBe(suggestion.suggestedAmount);
    expect(after.netBalance).toBe(0);
  });
});
