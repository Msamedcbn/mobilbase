import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const tenantStockItemIds = new Set(
        (store.stockItems || []).filter((s) => s.tenantId === tenantId).map((s) => s.id)
      );
      const logs = (store.stockLogs || []).filter((l) => tenantStockItemIds.has(l.entityId));
      // Return sorted by date desc
      const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(sortedLogs);
    }

    // Previously this loaded every stock item id for the tenant just to build an
    // `entityId IN (...)` filter, which grows with the tenant's catalogue. The
    // denormalised AuditLog.tenantId turns it into a single index scan.
    const dbLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "STOCK_",
        },
        tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(dbLogs);
  } catch (error) {
    return NextResponse.json({ error: "Loglar yüklenemedi" }, { status: 500 });
  }
}

