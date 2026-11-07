import { describe, expect, it } from "vitest";
import { FAQ_NODES, FAQ_ROOT_ID, salesWhatsAppHref, searchFaq } from "@/lib/sales-faq";

describe("sales FAQ bot content", () => {
  it("every option points to an existing node", () => {
    for (const [id, node] of Object.entries(FAQ_NODES)) {
      for (const option of node.options) {
        expect(FAQ_NODES[option.next], `${id} -> ${option.next}`).toBeDefined();
      }
    }
  });

  it("every node is reachable from the main menu", () => {
    const seen = new Set([FAQ_ROOT_ID]);
    const queue = [FAQ_ROOT_ID];
    while (queue.length) {
      for (const option of FAQ_NODES[queue.shift()!].options) {
        if (!seen.has(option.next)) {
          seen.add(option.next);
          queue.push(option.next);
        }
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(FAQ_NODES).sort());
  });

  it("every answer has text and a way to continue", () => {
    for (const node of Object.values(FAQ_NODES)) {
      expect(node.answer.length).toBeGreaterThan(0);
      expect(node.options.length).toBeGreaterThan(0);
    }
  });

  it("WhatsApp link mentions the topic the visitor read", () => {
    expect(decodeURIComponent(salesWhatsAppHref("Fiyatlar ne kadar?"))).toContain('"Fiyatlar ne kadar?" konusunu okudum');
    expect(decodeURIComponent(salesWhatsAppHref(FAQ_NODES[FAQ_ROOT_ID].question))).not.toContain("konusunu okudum");
    expect(salesWhatsAppHref()).toMatch(/^https:\/\/wa\.me\/905525751101\?text=/);
  });
});

describe("sales FAQ search", () => {
  it("finds questions by Turkish keywords regardless of case", () => {
    expect(searchFaq("TAKSİT")).toContain("f_credit");
    expect(searchFaq("yazıcı")).toContain("f_print");
    expect(searchFaq("ne kadar")[0]).toBe("pricing");
  });

  it("never returns category menus and ignores too-short queries", () => {
    expect(searchFaq("özellikler")).not.toContain("c_features");
    expect(searchFaq("a")).toEqual([]);
    expect(searchFaq("zzzz")).toEqual([]);
  });
});
