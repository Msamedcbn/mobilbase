import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

type StudioAuditTargetType = "TENANT" | "PRICING" | "LEDGER" | "LICENSE" | "HELPDESK" | "LEAD" | "TRIAL" | "TEAM";

export async function logStudioAction(entry: {
  actor: string;
  action: string;
  targetType: StudioAuditTargetType;
  targetId?: string;
  detail: string;
  context?: Record<string, unknown>;
}) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (!store.studioAuditLogs) store.studioAuditLogs = [];
    store.studioAuditLogs.unshift({
      id: localId("audit"),
      createdAt: new Date().toISOString(),
      actor: entry.actor,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: entry.detail,
      context: entry.context,
    });
    await writeLocalStore(store);
    return;
  }

  await prisma.studioAuditLog.create({
    data: {
      actor: entry.actor,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      detail: entry.detail,
      context: entry.context as Prisma.InputJsonValue | undefined,
    },
  });
}
