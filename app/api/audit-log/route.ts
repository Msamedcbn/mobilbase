import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/errors";

export async function GET(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const action = searchParams.get("action");

  try {
    const entries = await prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(action ? { action } : {}),
        ...(from
          ? { createdAt: { gte: new Date(`${from}T00:00:00`), lte: to ? new Date(`${to}T23:59:59.999`) : new Date() } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        actorUser: { select: { fullName: true, email: true } },
        customer: { select: { fullName: true } },
      },
    });

    return ok(entries);
  } catch (error) {
    return fail(getErrorMessage(error), "INTERNAL", 500);
  }
}
