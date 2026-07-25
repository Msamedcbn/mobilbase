import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIdentifier, resetRateLimit } from "../lib/rate-limit";

function reqFrom(ip: string) {
  return new Request("https://app.test/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("rate limiting", () => {
  it("allows up to the limit then rejects", async () => {
    const req = reqFrom("10.0.0.1");
    const opts = { bucket: "test-basic", limit: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      expect((await checkRateLimit(req, opts)).ok).toBe(true);
    }

    const blocked = await checkRateLimit(req, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each client IP separately", async () => {
    const opts = { bucket: "test-per-ip", limit: 1, windowMs: 60_000 };

    expect((await checkRateLimit(reqFrom("10.0.0.2"), opts)).ok).toBe(true);
    expect((await checkRateLimit(reqFrom("10.0.0.2"), opts)).ok).toBe(false);
    // A different client must not inherit the first one's exhausted budget.
    expect((await checkRateLimit(reqFrom("10.0.0.3"), opts)).ok).toBe(true);
  });

  it("keeps buckets independent", async () => {
    const req = reqFrom("10.0.0.4");
    expect((await checkRateLimit(req, { bucket: "bucket-a", limit: 1, windowMs: 60_000 })).ok).toBe(true);
    expect((await checkRateLimit(req, { bucket: "bucket-a", limit: 1, windowMs: 60_000 })).ok).toBe(false);
    expect((await checkRateLimit(req, { bucket: "bucket-b", limit: 1, windowMs: 60_000 })).ok).toBe(true);
  });

  it("separates identities within a bucket via key", async () => {
    const req = reqFrom("10.0.0.5");
    const base = { bucket: "test-keyed", limit: 1, windowMs: 60_000 };

    expect((await checkRateLimit(req, { ...base, key: "a@test" })).ok).toBe(true);
    expect((await checkRateLimit(req, { ...base, key: "a@test" })).ok).toBe(false);
    expect((await checkRateLimit(req, { ...base, key: "b@test" })).ok).toBe(true);
  });

  it("resetRateLimit clears the counter after a successful login", async () => {
    const req = reqFrom("10.0.0.6");
    const opts = { bucket: "test-reset", limit: 1, windowMs: 60_000, key: "user@test" };

    expect((await checkRateLimit(req, opts)).ok).toBe(true);
    expect((await checkRateLimit(req, opts)).ok).toBe(false);

    resetRateLimit(req, { bucket: "test-reset", key: "user@test" });
    expect((await checkRateLimit(req, opts)).ok).toBe(true);
  });

  it("expires the window so a blocked client recovers", async () => {
    const req = reqFrom("10.0.0.7");
    const opts = { bucket: "test-expiry", limit: 1, windowMs: 20 };

    expect((await checkRateLimit(req, opts)).ok).toBe(true);
    expect((await checkRateLimit(req, opts)).ok).toBe(false);

    await new Promise((r) => setTimeout(r, 30));
    expect((await checkRateLimit(req, opts)).ok).toBe(true);
  });

  it("takes the leftmost x-forwarded-for entry and falls back when absent", () => {
    const chained = new Request("https://app.test/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIdentifier(chained)).toBe("1.2.3.4");
    expect(getClientIdentifier(new Request("https://app.test/"))).toBe("unknown");
  });
});
