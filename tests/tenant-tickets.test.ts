import { beforeEach, describe, expect, it, vi } from "vitest";

// Fully mocked — no real DB/session touched. This is what the plan-eng-review
// flagged as a critical gap: tenant/tickets previously resolved "the tenant"
// via a single process.env.TENANT_NAME, so any authenticated dealer could
// read/write any other dealer's tickets. These tests pin the fix: the route
// must scope strictly to the caller's own tenantId via requireTenant().

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
  requireRole: vi.fn(),
}));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/lib/runtime-mode", () => ({
  isDbDisabledMode: () => false,
}));

const TENANT_A = { id: "tenant-a", notes: JSON.stringify({ isSaaS: true, tickets: [{ id: "t-1", title: "A's bug" }] }) };
const TENANT_B = { id: "tenant-b", notes: JSON.stringify({ isSaaS: true, tickets: [{ id: "t-2", title: "B's bug" }] }) };

describe("tenant/tickets route — tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET rejects a request with no session (401)", async () => {
    mockGetSessionUser.mockReturnValue(null);
    const { GET } = await import("../app/api/tenant/tickets/route");

    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("GET rejects a caller with no tenantId (403) — e.g. PLATFORM_OWNER hitting this route directly", async () => {
    mockGetSessionUser.mockReturnValue({ userId: "u1", role: "PLATFORM_OWNER", tenantId: null });
    const { GET } = await import("../app/api/tenant/tickets/route");

    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("GET scopes strictly to the caller's own tenantId, never a global fallback", async () => {
    mockGetSessionUser.mockReturnValue({ userId: "u-b", role: "CASHIER", tenantId: "tenant-b" });
    mockFindUnique.mockResolvedValue(TENANT_B);
    const { GET } = await import("../app/api/tenant/tickets/route");

    const res = await GET();
    const body = await res.json();

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "tenant-b" } });
    expect(body.tickets).toEqual([{ id: "t-2", title: "B's bug" }]);
  });

  it("tenant A's session can never read tenant B's tickets", async () => {
    mockGetSessionUser.mockReturnValue({ userId: "u-a", role: "CASHIER", tenantId: "tenant-a" });
    mockFindUnique.mockResolvedValue(TENANT_A);
    const { GET } = await import("../app/api/tenant/tickets/route");

    const res = await GET();
    const body = await res.json();

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "tenant-a" } });
    expect(body.tickets).not.toContainEqual(expect.objectContaining({ id: "t-2" }));
  });

  it("POST writes the new ticket under the caller's own tenantId only", async () => {
    mockGetSessionUser.mockReturnValue({ userId: "u-a", role: "MANAGER", tenantId: "tenant-a" });
    mockFindUnique.mockResolvedValue(TENANT_A);
    mockUpdate.mockResolvedValue({});
    const { POST } = await import("../app/api/tenant/tickets/route");

    const req = new Request("http://localhost/api/tenant/tickets", {
      method: "POST",
      body: JSON.stringify({ title: "New issue", category: "bug", message: "it broke" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "tenant-a" } });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tenant-a" } }),
    );
  });

  it("PUT rejects an unauthenticated caller before touching the DB", async () => {
    mockGetSessionUser.mockReturnValue(null);
    const { PUT } = await import("../app/api/tenant/tickets/route");

    const req = new Request("http://localhost/api/tenant/tickets", {
      method: "PUT",
      body: JSON.stringify({ ticketId: "t-2", message: "trying to reply to B's ticket" }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
