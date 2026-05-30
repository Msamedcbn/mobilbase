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
  
  let tenantName = "TelefoncuPro";
  let rolePermissions = DEFAULT_ROLE_PERMISSIONS;
  let activeModules = DEFAULT_ACTIVE_MODULES;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = user.tenantId
        ? store.customers.find((c) => c.id === user.tenantId)
        : store.customers.find((c) => c.fullName === (process.env.TENANT_NAME ?? "TelefoncuPro"));
      if (customer) {
        tenantName = customer.fullName;
        if (customer.notes) {
          const parsed = JSON.parse(customer.notes);
          if (parsed.rolePermissions) rolePermissions = parsed.rolePermissions;
          if (parsed.modules) activeModules = { ...parsed.modules, buyback: true };
        }
      }
    } else {
      const customer = user.tenantId
        ? await prisma.customer.findUnique({ where: { id: user.tenantId } })
        : await prisma.customer.findFirst({ where: { fullName: process.env.TENANT_NAME ?? "TelefoncuPro" } });
      if (customer) {
        tenantName = customer.fullName;
        if (customer.notes) {
          const parsed = JSON.parse(customer.notes);
          if (parsed.rolePermissions) rolePermissions = parsed.rolePermissions;
          if (parsed.modules) activeModules = { ...parsed.modules, buyback: true };
        }
      }
    }
  } catch (err) {
    console.error("Failed to load tenant metadata for auth me:", err);
  }

  return NextResponse.json({ 
    user, 
    tenantName,
    rolePermissions,
    activeModules
  });
}
