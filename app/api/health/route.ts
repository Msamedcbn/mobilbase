import { prisma } from "@/lib/prisma";
import { getBootstrapStatus } from "@/lib/config";
import { logEvent } from "@/lib/logger";
import { isDbDisabledMode } from "@/lib/runtime-mode";

export async function GET() {
  const bootstrap = getBootstrapStatus();
  const noDbMode = isDbDisabledMode();
  if (noDbMode) {
    return Response.json(
      {
        status: bootstrap.ok ? "ok" : "degraded",
        mode: "db_disabled",
        checks: {
          bootstrap,
          db: "skipped",
        },
        now: new Date().toISOString(),
      },
      { status: bootstrap.ok ? 200 : 503 },
    );
  }

  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (error) {
    logEvent("warn", "health.db_unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  const healthy = bootstrap.ok && db;
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        bootstrap,
        db,
      },
      now: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
