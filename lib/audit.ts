import { prisma } from "@/lib/prisma";
import { maskSensitiveText } from "@/lib/privacy";

export async function writeAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string;
  detail?: string;
  actorUserId?: string;
  customerId?: string;
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
    },
  });
}
