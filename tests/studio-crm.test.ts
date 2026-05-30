import { describe, expect, it } from "vitest";
import { inferSuggestions, normalizeCrmTask } from "../lib/studio-crm";

describe("studio crm workflow", () => {
  it("generates no-contact and offer-no-response suggestions", () => {
    const suggestions = inferSuggestions({
      tenantId: "t-1",
      tenantName: "Test Tenant",
      leadStatus: "OFFER_SENT",
      leadHistory: [{ date: "2026-05-20", note: "teklif gonderildi", author: "admin" }],
      expectedDealAmount: 25000,
      openTicketCount: 1,
      ownerUserId: "u-1",
    });

    const types = suggestions.map((s) => s.type);
    expect(types).toContain("NO_CONTACT_3_DAYS");
    expect(types).toContain("OFFER_NO_RESPONSE");
    expect(types).toContain("HIGH_MRR_CANDIDATE");
    expect(types).toContain("TICKET_FOLLOW_UP");
  });

  it("creates normalized task payload from suggestion", () => {
    const [suggestion] = inferSuggestions({
      tenantId: "t-2",
      tenantName: "Tenant 2",
      leadStatus: "LEAD",
      leadHistory: [{ date: "2026-05-20", note: "ilk gorusme", author: "admin" }],
      ownerUserId: "u-2",
    });

    const task = normalizeCrmTask({
      ...suggestion.suggestedTask,
      id: "crm-task-1",
      createdAt: "2026-05-27T10:00:00.000Z",
      updatedAt: "2026-05-27T10:00:00.000Z",
      source: "SUGGESTION",
    });

    expect(task.id).toBe("crm-task-1");
    expect(task.status).toBe("OPEN");
    expect(task.source).toBe("SUGGESTION");
    expect(task.ownerUserId).toBe("u-2");
  });

  it("simulates lead update -> suggestion -> task lifecycle", () => {
    const initialLeadStatus = "NEGOTIATION" as const;
    const suggestions = inferSuggestions({
      tenantId: "t-3",
      tenantName: "Tenant 3",
      leadStatus: initialLeadStatus,
      leadHistory: [{ date: "2026-05-19", note: "takip bekliyor", author: "admin" }],
      ownerUserId: "u-3",
    });

    expect(suggestions.length).toBeGreaterThan(0);

    const createdTask = normalizeCrmTask({
      ...suggestions[0].suggestedTask,
      id: "crm-task-3",
      createdAt: "2026-05-27T11:00:00.000Z",
      updatedAt: "2026-05-27T11:00:00.000Z",
    });

    expect(createdTask.status).toBe("OPEN");

    const progressedTask = normalizeCrmTask({
      ...createdTask,
      status: "DONE",
      updatedAt: "2026-05-27T12:00:00.000Z",
    });

    expect(progressedTask.status).toBe("DONE");
    expect(progressedTask.updatedAt).toBe("2026-05-27T12:00:00.000Z");
  });
});
