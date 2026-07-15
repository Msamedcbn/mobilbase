import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  const userId = params.id;
  const body = await req.json().catch(() => ({}));
  const moduleOverrides = body?.moduleOverrides;
  if (!moduleOverrides || typeof moduleOverrides !== "object" || Array.isArray(moduleOverrides)) {
    return NextResponse.json({ error: "moduleOverrides bir obje olmalidir." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const user = (store.users || []).find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });
    user.moduleOverrides = moduleOverrides;
    user.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    return NextResponse.json({ success: true, user });
  }

  const user = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });

  const updated = await prisma.appUser.update({
    where: { id: userId },
    data: { moduleOverrides },
    select: { id: true, fullName: true, email: true, role: true, isActive: true, moduleOverrides: true },
  });

  return NextResponse.json({ success: true, user: updated });
}
