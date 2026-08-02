import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireRole = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}));

describe("studio/infrastructure route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized roles with 403 or 401 via requireRole", async () => {
    mockRequireRole.mockReturnValue({ error: { status: 403 } });
    const { GET } = await import("../app/api/studio/infrastructure/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns exactly 30 telemetry points for authorized users", async () => {
    mockRequireRole.mockReturnValue({ error: null, user: { role: "PLATFORM_OWNER" } });
    const { GET } = await import("../app/api/studio/infrastructure/route");
    const res = await GET();
    const body = await res.json();
    
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.telemetry).toHaveLength(30);

    const firstPoint = body.telemetry[0];
    expect(firstPoint).toHaveProperty("timestamp");
    expect(firstPoint).toHaveProperty("cpuLoad");
    expect(firstPoint).toHaveProperty("memoryUsed");
    expect(firstPoint).toHaveProperty("memoryTotal");
    expect(firstPoint).toHaveProperty("apiRequestRate");
  });
});
