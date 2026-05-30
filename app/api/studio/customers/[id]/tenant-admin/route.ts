import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { parseTenantMetadata, stringifyTenantMetadata } from "@/lib/tenant-metadata";

type TenantAdminAction = "FREEZE" | "UNFREEZE" | "RESET_PASSWORD";

function resolvePrimaryLocalUser(store: Awaited<ReturnType<typeof readLocalStore>>, tenantId: string, tenantEmail: string | null) {
  const users = (store.users || []).filter((u) => u.tenantId === tenantId);
  if (!users.length) return null;
  const byEmail = tenantEmail ? users.find((u) => u.email.toLowerCase() === tenantEmail.toLowerCase()) : null;
  if (byEmail) return byEmail;
  return [...users].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())[0];
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["PLATFORM_OWNER", "ADMIN"]);
  if (auth.error) return auth.error;

  const tenantId = params.id;
  const body = await req.json();
  const action = String(body?.action || "") as TenantAdminAction;

  if (!["FREEZE", "UNFREEZE", "RESET_PASSWORD"].includes(action)) {
    return NextResponse.json({ error: "Gecersiz action." }, { status: 400 });
  }

  if (action === "RESET_PASSWORD") {
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Yeni sifre en az 6 karakter olmali." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Sifre tekrari uyusmuyor." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const tenant = store.customers.find((c) => c.id === tenantId);
      if (!tenant) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });

      const user = resolvePrimaryLocalUser(store, tenantId, tenant.email);
      if (!user) return NextResponse.json({ error: "Tenant kullanicisi bulunamadi." }, { status: 404 });

      user.passwordHash = hashSync(newPassword, 10);
      user.isActive = true;
      user.updatedAt = new Date().toISOString();
      await writeLocalStore(store);
      return NextResponse.json({ success: true, message: "Tenant ana kullanici sifresi sifirlandi." });
    }

    const tenant = await prisma.customer.findUnique({ where: { id: tenantId }, select: { id: true, email: true } });
    if (!tenant) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });

    const users = await prisma.appUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
    const primary =
      (tenant.email ? users.find((u) => u.email.toLowerCase() === tenant.email!.toLowerCase()) : null) || users[0];
    if (!primary) {
      return NextResponse.json({ error: "Tenant kullanicisi bulunamadi." }, { status: 404 });
    }

    await prisma.appUser.update({
      where: { id: primary.id },
      data: { passwordHash: hashSync(newPassword, 10), isActive: true },
    });
    return NextResponse.json({ success: true, message: "Tenant ana kullanici sifresi sifirlandi." });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const tenantIndex = store.customers.findIndex((c) => c.id === tenantId);
    if (tenantIndex === -1) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });

    const meta = parseTenantMetadata(store.customers[tenantIndex].notes);
    meta.isFrozen = action === "FREEZE";
    store.customers[tenantIndex].notes = stringifyTenantMetadata({ ...meta, isSaaS: true });

    store.users = (store.users || []).map((u) =>
      u.tenantId === tenantId ? { ...u, isActive: action !== "FREEZE", updatedAt: new Date().toISOString() } : u
    );
    await writeLocalStore(store);
    return NextResponse.json({
      success: true,
      message: action === "FREEZE" ? "Tenant donduruldu ve kullanicilar pasif edildi." : "Tenant aktif edildi.",
    });
  }

  const tenant = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  if (!tenant) return NextResponse.json({ error: "Tenant bulunamadi." }, { status: 404 });
  const meta = parseTenantMetadata(tenant.notes);
  meta.isFrozen = action === "FREEZE";

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: tenantId },
      data: { notes: stringifyTenantMetadata({ ...meta, isSaaS: true }) },
    }),
    prisma.appUser.updateMany({
      where: { tenantId },
      data: { isActive: action !== "FREEZE" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: action === "FREEZE" ? "Tenant donduruldu ve kullanicilar pasif edildi." : "Tenant aktif edildi.",
  });
}
