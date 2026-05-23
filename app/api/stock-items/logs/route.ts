import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const logs = store.stockLogs || [];
      // Return sorted by date desc
      const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json(sortedLogs);
    }

    const dbLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "STOCK_",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(dbLogs);
  } catch (error) {
    return NextResponse.json({ error: "Loglar yuklenemedi" }, { status: 500 });
  }
}
