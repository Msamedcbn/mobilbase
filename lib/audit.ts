import { prisma } from "@/lib/prisma";
import { maskSensitiveText } from "@/lib/privacy";

export async function writeAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
  actorUserId?: string;
  customerId?: string;
  /**
   * Tenant the audited action belongs to. Callers pass the acting user's
   * tenantId; readers filter on it. Optional in the type so platform-level
   * actions (Studio, subscriptions) can legitimately record a null tenant, but
   * every tenant-scoped route should supply it or its entries become invisible
   * to that tenant's audit views.
   */
  tenantId?: string | null;
}) {
  const safeDetail = input.detail ? maskSensitiveText(input.detail) : input.detail;

  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: safeDetail,
      actorUserId: input.actorUserId,
      customerId: input.customerId,
      tenantId: input.tenantId ?? null,
    },
  });
}
