import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";

export async function GET() {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  if (isDbDisabledMode()) return ok([]);

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [{ action: "PRICING_RULE_CREATE" }, { action: "PRICING_RULE_UPDATE" }, { action: "PRICING_RULE_DELETE" }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok(logs);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
