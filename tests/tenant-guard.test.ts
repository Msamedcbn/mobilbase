import { describe, expect, it } from "vitest";
import { pickFields } from "../lib/tenant-guard";

const INVOICE_EDITABLE = ["invoiceNo", "totalAmount", "paidAmount", "dueAmount"] as const;

describe("pickFields allowlist", () => {
  it("drops tenantId so a caller cannot move a record between tenants", () => {
    const body = { invoiceNo: "INV-1", totalAmount: 100, tenantId: "victim-tenant" };
    const result = pickFields(body, INVOICE_EDITABLE);

    expect(result).toEqual({ invoiceNo: "INV-1", totalAmount: 100 });
    expect("tenantId" in result).toBe(false);
  });

  it("drops id and timestamps", () => {
    const body = { invoiceNo: "INV-1", id: "other-id", createdAt: "2020-01-01", updatedAt: "2020-01-01" };
    expect(pickFields(body, INVOICE_EDITABLE)).toEqual({ invoiceNo: "INV-1" });
  });

  it("omits keys that are absent or explicitly undefined, so they are not nulled out", () => {
    const body = { invoiceNo: "INV-1", totalAmount: undefined };
    const result = pickFields(body, INVOICE_EDITABLE);

    expect(result).toEqual({ invoiceNo: "INV-1" });
    expect("totalAmount" in result).toBe(false);
  });

  it("keeps falsy values that are meaningful", () => {
    const body = { totalAmount: 0, paidAmount: false, dueAmount: null };
    expect(pickFields(body, INVOICE_EDITABLE)).toEqual({
      totalAmount: 0,
      paidAmount: false,
      dueAmount: null,
    });
  });

  it("ignores inherited properties", () => {
    const body = Object.create({ tenantId: "victim-tenant", invoiceNo: "INHERITED" });
    body.totalAmount = 5;

    expect(pickFields(body, INVOICE_EDITABLE)).toEqual({ totalAmount: 5 });
  });

  it("returns an empty object for non-object input", () => {
    for (const bad of [null, undefined, "string", 42, true]) {
      expect(pickFields(bad, INVOICE_EDITABLE)).toEqual({});
    }
  });
});
