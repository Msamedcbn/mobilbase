import { NextResponse } from "next/server";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

interface TenantMeta {
  isSaas?: boolean;
  isTrial?: boolean;
  trialExpiresAt?: string;
  plan?: string;
  licenseEnd?: string;
}

function parseMeta(customer: { notes: string | null }): TenantMeta {
  try {
    return customer.notes ? JSON.parse(customer.notes) : {};
  } catch {
    return {};
  }
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
}

export async function GET(req: Request) {
  const token = req.headers.get("x-internal-token") || new URL(req.url).searchParams.get("token");
  const expected = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = await readLocalStore();
    const now = Date.now();
    const affected: Array<{ tenantId: string; name: string; action: string; daysRemaining: number }> = [];

    for (const customer of store.customers) {
      const meta = parseMeta(customer);

      if (!meta.isSaas || !meta.isTrial) continue;
      if (!meta.trialExpiresAt) continue;

      const days = daysUntil(meta.trialExpiresAt);

      if (days <= 0) {
        if (meta.plan !== "EXPIRED") {
          const metaObj: any = meta;
          metaObj.plan = "EXPIRED";
          metaObj.licenseEnd = new Date().toISOString();
          metaObj.leadHistory = metaObj.leadHistory || [];
          metaObj.leadHistory.push({
            status: "TRIAL_EXPIRED",
            date: new Date().toISOString(),
            note: "Auto-expired by lifecycle job",
          });

          customer.notes = JSON.stringify(metaObj);
          affected.push({ tenantId: customer.id, name: customer.fullName, action: "EXPIRED", daysRemaining: days });

          store.studioAuditLogs = store.studioAuditLogs || [];
          store.studioAuditLogs.unshift({
            id: localId("audit"),
            createdAt: new Date().toISOString(),
            actor: "LifecycleJob",
            action: "TRIAL_EXPIRED",
            targetType: "TENANT",
            targetId: customer.id,
            detail: `${customer.fullName} trial expired (${days} days past)`,
          });
        }
      } else if (days <= 1) {
        affected.push({ tenantId: customer.id, name: customer.fullName, action: "WARN_1D", daysRemaining: days });
      } else if (days <= 3) {
        affected.push({ tenantId: customer.id, name: customer.fullName, action: "WARN_3D", daysRemaining: days });
      } else if (days <= 7) {
        affected.push({ tenantId: customer.id, name: customer.fullName, action: "WARN_7D", daysRemaining: days });
      }
    }

    if (affected.length > 0) {
      await writeLocalStore(store);
    }

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      affected,
      summary: {
        totalTrials: store.customers.filter((c) => { const m = parseMeta(c); return m.isTrial; }).length,
        expired: affected.filter((a) => a.action === "EXPIRED").length,
        day1: affected.filter((a) => a.action === "WARN_1D").length,
        day3: affected.filter((a) => a.action === "WARN_3D").length,
        day7: affected.filter((a) => a.action === "WARN_7D").length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
