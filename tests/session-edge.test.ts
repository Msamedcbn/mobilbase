import { beforeAll, describe, expect, it } from "vitest";
import { createSignedSessionToken } from "../lib/session";
import { verifySessionTokenEdge } from "../lib/session-edge";

const SECRET = "test-secret-for-edge-verification";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    fullName: "Admin",
    tenantId: "tenant-1",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

function forgeUnsignedToken(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.0.0`;
}

describe("edge session verification", () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = SECRET;
  });

  it("accepts a token signed by the node signer", async () => {
    const token = createSignedSessionToken(validPayload() as any);
    const result = await verifySessionTokenEdge(token);

    expect(result).not.toBeNull();
    expect(result?.role).toBe("ADMIN");
    expect(result?.tenantId).toBe("tenant-1");
  });

  it("rejects an unsigned token", async () => {
    // The trial flow used to mint exactly this shape, and middleware accepted it.
    const token = forgeUnsignedToken(validPayload({ role: "PLATFORM_OWNER" }));
    expect(await verifySessionTokenEdge(token)).toBeNull();
  });

  it("rejects a token whose payload was edited after signing", async () => {
    const token = createSignedSessionToken(validPayload() as any);
    const [, signature] = token.split(".");

    const escalated = Buffer.from(
      JSON.stringify(validPayload({ role: "PLATFORM_OWNER", tenantId: "victim-tenant" })),
      "utf8",
    ).toString("base64url");

    expect(await verifySessionTokenEdge(`${escalated}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    process.env.SESSION_SECRET = "some-other-secret";
    const foreign = createSignedSessionToken(validPayload() as any);
    process.env.SESSION_SECRET = SECRET;

    expect(await verifySessionTokenEdge(foreign)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = createSignedSessionToken(validPayload({ expiresAt: Date.now() - 1 }) as any);
    expect(await verifySessionTokenEdge(token)).toBeNull();
  });

  it("rejects malformed input without throwing", async () => {
    for (const bad of ["", "no-dot", "a.b.c.d", "...", "!!!.???"]) {
      expect(await verifySessionTokenEdge(bad)).toBeNull();
    }
  });
});
