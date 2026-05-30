import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { DEFAULT_CRM_FIELDS, daysFrom } from "@/lib/studio-crm";

function parseMeta(notes: string | null) {
  if (!notes) return { isSaaS: false } as any;
  try {
    const parsed = JSON.parse(notes);
    if (!parsed?.isSaaS) return { isSaaS: false } as any;
    return {
      ...parsed,
      ...DEFAULT_CRM_FIELDS,
      ...parsed,
      crmTasks: Array.isArray(parsed.crmTasks) ? parsed.crmTasks : [],
      leadHistory: Array.isArray(parsed.leadHistory) ? parsed.leadHistory : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      leadStatus: parsed.leadStatus || "LEAD",
    };
  } catch {
    return { isSaaS: false } as any;
  }
}

export async function GET() {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER"]);
  if (auth.error) return auth.error;

  const customers = isDbDisabledMode()
    ? (await readLocalStore()).customers
    : await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });

  const tenants = customers
    .map((c: any) => ({
      id: c.id,
      fullName: c.fullName,
      meta: parseMeta(c.notes),
    }))
    .filter((x) => x.meta.isSaaS);

  const total = tenants.length;
  const won = tenants.filter((t) => t.meta.leadStatus === "WON").length;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;

  const stageAging = ["LEAD", "NEGOTIATION", "OFFER_SENT", "WON", "LOST"].map((stage) => {
    const rows = tenants.filter((t) => t.meta.leadStatus === stage);
    const avgDays = rows.length
      ? Math.round(
          rows.reduce((acc, r) => acc + daysFrom(r.meta.leadHistory?.[0]?.date), 0) / rows.length
        )
      : 0;
    return { stage, count: rows.length, avgDays };
  });

  const owners: Record<string, { total: number; won: number }> = {};
  for (const t of tenants) {
    const owner = t.meta.ownerUserId || "UNASSIGNED";
    if (!owners[owner]) owners[owner] = { total: 0, won: 0 };
    owners[owner].total += 1;
    if (t.meta.leadStatus === "WON") owners[owner].won += 1;
  }

  const ownerPerformance = Object.entries(owners).map(([ownerUserId, v]) => ({
    ownerUserId,
    totalLeads: v.total,
    wonLeads: v.won,
    conversionRate: v.total ? Number(((v.won / v.total) * 100).toFixed(2)) : 0,
  }));

  const funnel = {
    LEAD: tenants.filter((t) => t.meta.leadStatus === "LEAD").length,
    NEGOTIATION: tenants.filter((t) => t.meta.leadStatus === "NEGOTIATION").length,
    OFFER_SENT: tenants.filter((t) => t.meta.leadStatus === "OFFER_SENT").length,
    WON: tenants.filter((t) => t.meta.leadStatus === "WON").length,
    LOST: tenants.filter((t) => t.meta.leadStatus === "LOST").length,
  };

  const actionRequired = tenants
    .filter((t) => t.meta.leadStatus !== "WON" && t.meta.leadStatus !== "LOST" && daysFrom(t.meta.nextActionDate) >= 0)
    .map((t) => ({ tenantId: t.id, tenantName: t.fullName, nextActionDate: t.meta.nextActionDate || "" }));

  return NextResponse.json({
    asOf: new Date().toISOString(),
    kpis: {
      totalLeads: total,
      wonLeads: won,
      leadToWonConversionPct: Number(conversionRate.toFixed(2)),
      averageTimeToWinDays: stageAging.find((s) => s.stage === "WON")?.avgDays || 0,
    },
    funnel,
    stageAging,
    ownerPerformance,
    actionRequired,
  });
}
