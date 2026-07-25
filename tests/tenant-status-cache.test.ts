import { describe, expect, it } from "vitest";
import {
  getCachedTenantStatus,
  invalidateTenantStatus,
  setCachedTenantStatus,
} from "../lib/tenant-status-cache";

const status = { frozen: false, userActive: true, sessionEpoch: 0 };

describe("tenant status cache", () => {
  it("returns a miss for an unknown key", () => {
    expect(getCachedTenantStatus("never-written")).toBeNull();
  });

  it("round-trips a stored value", () => {
    setCachedTenantStatus("user-1:tenant-1", status);
    expect(getCachedTenantStatus("user-1:tenant-1")).toEqual(status);
  });

  it("keys are not shared between users", () => {
    setCachedTenantStatus("user-2:tenant-1", { frozen: true, userActive: true, sessionEpoch: 3 });
    expect(getCachedTenantStatus("user-3:tenant-1")).toBeNull();
  });

  it("invalidate drops the entry so the next read refetches", () => {
    setCachedTenantStatus("user-4:tenant-1", status);
    invalidateTenantStatus("user-4:tenant-1");
    expect(getCachedTenantStatus("user-4:tenant-1")).toBeNull();
  });

  it("preserves sessionEpoch, which middleware compares against the cookie", () => {
    setCachedTenantStatus("user-5:tenant-1", { frozen: false, userActive: true, sessionEpoch: 7 });
    expect(getCachedTenantStatus("user-5:tenant-1")?.sessionEpoch).toBe(7);
  });
});
