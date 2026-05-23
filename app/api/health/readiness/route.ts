import { prisma } from "@/lib/prisma";
import { getBootstrapStatus } from "@/lib/config";
import { isDbDisabledMode } from "@/lib/runtime-mode";

export async function GET() {
  const bootstrap = getBootstrapStatus();
  if (!bootstrap.ok) {
    return Response.json(
      {
        status: "not_ready",
        reason: "missing_env",
        missing: bootstrap.missing,
      },
      { status: 503 },
    );
  }

  if (isDbDisabledMode()) {
    return Response.json(
      {
        status: "ready",
        mode: "db_disabled",
      },
      { status: 200 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" }, { status: 200 });
  } catch {
    return Response.json(
      {
        status: "not_ready",
        reason: "db_unreachable",
      },
      { status: 503 },
    );
  }
}
