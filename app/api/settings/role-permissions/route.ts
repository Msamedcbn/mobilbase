import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { writeAuditLog } from "@/lib/audit";

const EDITABLE_ROLES = ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"] as const;
type EditableRole = (typeof EDITABLE_ROLES)[number];
const MODULE_KEYS = ["pos", "repairs", "stock", "invoicing", "buyback", "branches"] as const;

const DEFAULT_ROLE_PERMISSIONS: Record<EditableRole, string[]> = {
  ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  CASHIER: ["pos"],
  TECHNICIAN: ["repairs"],
  ACCOUNTANT: ["invoicing"],
};

function parseNotes(notesStr: string | null | undefined) {
  if (!notesStr) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(notesStr);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const customer = isDbDisabledMode()
    ? (await readLocalStore()).customers.find((c) => c.id === tenantId)
    : await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });

  const meta = parseNotes(customer?.notes);
  const stored = (meta.rolePermissions ?? {}) as Record<string, string[]>;
  const rolePermissions: Record<EditableRole, string[]> = { ...DEFAULT_ROLE_PERMISSIONS };
  for (const role of EDITABLE_ROLES) {
    if (Array.isArray(stored[role])) rolePermissions[role] = stored[role];
  }

  return NextResponse.json({ rolePermissions, moduleKeys: MODULE_KEYS });
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const body = await req.json();
  const role = body?.role as EditableRole;
  const modules = body?.modules;
  if (!EDITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }
  if (!Array.isArray(modules) || !modules.every((m: unknown) => typeof m === "string" && MODULE_KEYS.includes(m as any))) {
    return NextResponse.json({ error: "Geçersiz modül listesi" }, { status: 400 });
  }

  async function readCustomer(id: string) {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const idx = store.customers.findIndex((c) => c.id === id);
      return { store, idx, notes: idx !== -1 ? store.customers[idx].notes : null };
    }
    const customer = await prisma.customer.findUnique({ where: { id }, select: { notes: true } });
    return { store: null, idx: -1, notes: customer?.notes ?? null };
  }

  const { store, idx, notes } = await readCustomer(tenantId);
  if (isDbDisabledMode() && idx === -1) {
    return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  }

  const meta = parseNotes(notes);
  const current: Record<string, string[]> = { ...DEFAULT_ROLE_PERMISSIONS, ...(meta.rolePermissions ?? {}) };
  current[role] = modules;
  meta.rolePermissions = current;

  if (isDbDisabledMode() && store) {
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
  } else {
    await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(meta) } });
    await writeAuditLog({
      action: "ROLE_PERMISSIONS_UPDATE",
      entityType: "Customer",
      entityId: tenantId,
      actorUserId: auth.user?.userId,
      tenantId,
      detail: `${role} rolünün yetkileri güncellendi: ${modules.join(", ") || "(hiçbiri)"}.`,
    });
  }

  return NextResponse.json({ role, modules });
}
