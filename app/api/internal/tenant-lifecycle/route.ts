import { NextResponse } from "next/server";
import { listTenants, updateTenantMetadata } from "@/lib/tenant-store";
import { parseTenantMetadata } from "@/lib/tenant-metadata";
import { logStudioAction } from "@/lib/studio-audit";

interface TenantMeta {
  isSaas?: boolean;
  isTrial?: boolean;
  trialExpiresAt?: string;
  plan?: string;
  licenseEnd?: string;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
}

/**
 * Nightly sweep that expires finished trials and reports the ones about to end.
 *
 * Reads and writes through lib/tenant-store, so it acts on the same tenant
 * records the application serves. It previously operated only on the local JSON
 * store, which meant trials never actually expired in production.
 */
export async function GET(req: Request) {
  const token = req.headers.get("x-internal-token") || new URL(req.url).searchParams.get("token");
  const expected = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await listTenants();
    const affected: Array<{ tenantId: string; name: string; action: string; daysRemaining: number }> = [];
    let totalTrials = 0;

    for (const tenant of tenants) {
      const meta = parseTenantMetadata(tenant.notes) as TenantMeta;

      if (meta.isTrial) totalTrials += 1;
      if (!meta.isSaas || !meta.isTrial) continue;
      if (!meta.trialExpiresAt) continue;

      const days = daysUntil(meta.trialExpiresAt);

      if (days > 0) {
        if (days <= 1) affected.push({ tenantId: tenant.id, name: tenant.fullName, action: "WARN_1D", daysRemaining: days });
        else if (days <= 3) affected.push({ tenantId: tenant.id, name: tenant.fullName, action: "WARN_3D", daysRemaining: days });
        else if (days <= 7) affected.push({ tenantId: tenant.id, name: tenant.fullName, action: "WARN_7D", daysRemaining: days });
        continue;
      }

      if (meta.plan === "EXPIRED") continue;

      await updateTenantMetadata(tenant.id, (current) => {
        const next = { ...current } as Record<string, any>;
        next.plan = "EXPIRED";
        next.licenseEnd = new Date().toISOString();
        next.leadHistory = Array.isArray(next.leadHistory) ? next.leadHistory : [];
        next.leadHistory.push({
          status: "TRIAL_EXPIRED",
          date: new Date().toISOString(),
          note: "Auto-expired by lifecycle job",
        });
        return next;
      });

      affected.push({ tenantId: tenant.id, name: tenant.fullName, action: "EXPIRED", daysRemaining: days });

      await logStudioAction({
        actor: "LifecycleJob",
        action: "TRIAL_EXPIRED",
        targetType: "TENANT",
        targetId: tenant.id,
        detail: `${tenant.fullName} trial expired (${Math.abs(days)} days past)`,
      });
    }

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      affected,
      summary: {
        totalTrials,
        expired: affected.filter((a) => a.action === "EXPIRED").length,
        day1: affected.filter((a) => a.action === "WARN_1D").length,
        day3: affected.filter((a) => a.action === "WARN_3D").length,
        day7: affected.filter((a) => a.action === "WARN_7D").length,
      },
    });
  } catch (err: any) {
    console.error("[tenant-lifecycle]", err);
    return NextResponse.json({ error: "Lifecycle job basarisiz" }, { status: 500 });
  }
}
