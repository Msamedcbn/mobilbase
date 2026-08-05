import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { isTenantFrozenFromNotes } from "@/lib/tenant-metadata";

const DEFAULT_ROLE_PERMISSIONS = {
  PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  CASHIER: ["pos"],
  TECHNICIAN: ["repairs"],
  ACCOUNTANT: ["invoicing"],
  STUDIO_OPERATOR: [] as string[],
};

const DEFAULT_ACTIVE_MODULES = {
  pos: true,
  repairs: true,
  stock: true,
  invoicing: true,
  buyback: true,
};

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  if (user.tenantId && user.role !== "PLATFORM_OWNER") {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const tenant = store.customers.find((c) => c.id === user.tenantId);
      if (isTenantFrozenFromNotes(tenant?.notes)) {
        return NextResponse.json({ error: "Tenant dondurulmustur." }, { status: 403 });
      }
    } else {
      const tenant = await prisma.customer.findUnique({ where: { id: user.tenantId }, select: { notes: true } });
      if (isTenantFrozenFromNotes(tenant?.notes)) {
        return NextResponse.json({ error: "Tenant dondurulmustur." }, { status: 403 });
      }
    }
  }
  
  let tenantName = "VibeGSM";
  let rolePermissions = DEFAULT_ROLE_PERMISSIONS;
  let activeModules = DEFAULT_ACTIVE_MODULES;
  let branding: { accentColor?: string; logoUrl?: string } = {};

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = user.tenantId
        ? store.customers.find((c) => c.id === user.tenantId)
        : store.customers.find((c) => c.fullName === (process.env.TENANT_NAME ?? "VibeGSM"));
      if (customer) {
        tenantName = customer.fullName;
        if (customer.notes) {
          const parsed = JSON.parse(customer.notes);
          if (parsed.rolePermissions) rolePermissions = parsed.rolePermissions;
          if (parsed.modules) activeModules = { ...parsed.modules };
          if (parsed.branding) branding = parsed.branding;
        }
      }
    } else {
      const customer = user.tenantId
        ? await prisma.customer.findUnique({ where: { id: user.tenantId } })
        : await prisma.customer.findFirst({ where: { fullName: process.env.TENANT_NAME ?? "VibeGSM" } });
      if (customer) {
        tenantName = customer.fullName;
        if (customer.notes) {
          const parsed = JSON.parse(customer.notes);
          if (parsed.rolePermissions) rolePermissions = parsed.rolePermissions;
          if (parsed.modules) activeModules = { ...parsed.modules };
          if (parsed.branding) branding = parsed.branding;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load tenant metadata for auth me:", err);
  }

  // MANAGER = ADMIN yetki eşdeğeri — login route'taki mantıkla aynı, sayfa yenilemesinde kaybolmasın diye
  if (user.role === "MANAGER") {
    const adminPerms = rolePermissions.ADMIN || [];
    const managerPerms = rolePermissions.MANAGER || [];
    rolePermissions = {
      ...rolePermissions,
      MANAGER: Array.from(new Set([...adminPerms, ...managerPerms, "branches"])),
    };
  }

  // Kullanıcı bazlı modül override — login route'taki mantıkla aynı, sayfa yenilemesinde de güncel kalsın diye
  try {
    let userModuleOverrides: Record<string, boolean> | null | undefined;
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      userModuleOverrides = store.users.find((u) => u.id === user.userId)?.moduleOverrides ?? null;
    } else {
      const appUser = await prisma.appUser.findUnique({ where: { id: user.userId }, select: { moduleOverrides: true } });
      userModuleOverrides = (appUser?.moduleOverrides as Record<string, boolean> | null) ?? null;
    }
    if (userModuleOverrides && typeof userModuleOverrides === "object") {
      const effective = new Set(rolePermissions[user.role] || []);
      for (const [mod, allowed] of Object.entries(userModuleOverrides)) {
        if (allowed) effective.add(mod); else effective.delete(mod);
      }
      rolePermissions = { ...rolePermissions, [user.role]: Array.from(effective) };
    }
  } catch (err) {
    console.error("Failed to load user module overrides for auth me:", err);
  }

  return NextResponse.json({
    user,
    tenantName,
    rolePermissions,
    activeModules,
    branding,
  });
}
