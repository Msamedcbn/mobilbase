import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER", "STUDIO_OPERATOR"]);
  if (auth.error) return auth.error;

  const tenantId = params.id;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const users = (store.users || [])
      .filter((u) => u.tenantId === tenantId)
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        moduleOverrides: u.moduleOverrides ?? null,
      }));
    return NextResponse.json({ users });
  }

  const users = await prisma.appUser.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, moduleOverrides: true },
  });

  return NextResponse.json({ users });
}
