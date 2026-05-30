import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

function canManage(role: string) {
  return role === "PLATFORM_OWNER" || role === "ADMIN";
}

export async function GET() {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  if (!auth.user || !canManage(auth.user.role)) {
    return NextResponse.json({ error: "Bu islem icin yetkiniz yok." }, { status: 403 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const users = (store.users || []).filter((u) => u.role !== "PLATFORM_OWNER" && !u.tenantId);
    const tenants = (store.customers || []).map((c) => ({ id: c.id, fullName: c.fullName, email: c.email }));
    return NextResponse.json({ users, tenants });
  }

  const [users, tenants] = await Promise.all([
    prisma.appUser.findMany({
      where: { role: { not: "PLATFORM_OWNER" }, tenantId: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    }),
    prisma.customer.findMany({
      select: { id: true, fullName: true, email: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ users, tenants });
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  if (!auth.user || !canManage(auth.user.role)) {
    return NextResponse.json({ error: "Bu islem icin yetkiniz yok." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId || "").trim();
  const tenantId = String(body?.tenantId || "").trim();
  const auto = Boolean(body?.auto);

  if (isDbDisabledMode()) {
    const store = await readLocalStore();

    if (auto) {
      let fixed = 0;
      let unresolved = 0;
      for (const user of store.users || []) {
        if (user.role === "PLATFORM_OWNER" || user.tenantId) continue;
        const match = (store.customers || []).find(
          (c) => c.email && c.email.toLowerCase() === user.email.toLowerCase()
        );
        if (!match) {
          unresolved++;
          continue;
        }
        user.tenantId = match.id;
        user.updatedAt = new Date().toISOString();
        fixed++;
      }
      await writeLocalStore(store);
      return NextResponse.json({ success: true, fixed, unresolved, message: "Otomatik tenant atama tamamlandi." });
    }

    if (!userId || !tenantId) {
      return NextResponse.json({ error: "userId ve tenantId zorunludur." }, { status: 400 });
    }

    const user = (store.users || []).find((u) => u.id === userId);
    if (!user) return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });
    const tenant = (store.customers || []).find((c) => c.id === tenantId);
    if (!tenant) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });

    user.tenantId = tenantId;
    user.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    return NextResponse.json({ success: true, message: "Kullanici tenant'a atandi." });
  }

  if (auto) {
    const unassignedUsers = await prisma.appUser.findMany({
      where: { role: { not: "PLATFORM_OWNER" }, tenantId: null },
      select: { id: true, email: true },
    });

    let fixed = 0;
    let unresolved = 0;
    for (const user of unassignedUsers) {
      const tenant = await prisma.customer.findFirst({
        where: { email: { equals: user.email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!tenant) {
        unresolved++;
        continue;
      }
      await prisma.appUser.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });
      fixed++;
    }

    return NextResponse.json({ success: true, fixed, unresolved, message: "Otomatik tenant atama tamamlandi." });
  }

  if (!userId || !tenantId) {
    return NextResponse.json({ error: "userId ve tenantId zorunludur." }, { status: 400 });
  }

  const [user, tenant] = await Promise.all([
    prisma.appUser.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    prisma.customer.findUnique({ where: { id: tenantId }, select: { id: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "Kullanici bulunamadi." }, { status: 404 });
  if (user.role === "PLATFORM_OWNER") {
    return NextResponse.json({ error: "PLATFORM_OWNER kullanicisi tenant'a baglanamaz." }, { status: 400 });
  }
  if (!tenant) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });

  await prisma.appUser.update({
    where: { id: userId },
    data: { tenantId },
  });

  return NextResponse.json({ success: true, message: "Kullanici tenant'a atandi." });
}
