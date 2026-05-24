import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { ok, fail } from "@/lib/api-response";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const logs = store.transferLogs || [];
      return ok(logs);
    }

    const dbLogs = await prisma.auditLog.findMany({
      where: {
        action: "STOCK_TRANSFER",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const formattedLogs = dbLogs.map((log) => {
      let parsedDetail = {};
      try {
        if (log.detail) {
          parsedDetail = JSON.parse(log.detail);
        }
      } catch (e) {
        // Fallback if not valid JSON
      }

      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        ...parsedDetail,
      };
    });

    return ok(formattedLogs);
  } catch (error) {
    return fail(getErrorMessage(error), "INTERNAL", 500);
  }
}
