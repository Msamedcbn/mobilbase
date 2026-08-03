import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { writeAuditLog } from "@/lib/audit";

const MODULE_KEYS = ["pos", "repairs", "stock", "invoicing", "buyback"] as const;
type ModuleKey = (typeof MODULE_KEYS)[number];

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

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === tenantId);
    const meta = parseNotes(customer?.notes);
    return NextResponse.json({ modules: meta.modules ?? {} });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  const meta = parseNotes(customer?.notes);
  return NextResponse.json({ modules: meta.modules ?? {} });
}

export async function PATCH(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const body = await req.json();
  const moduleKey = body?.module as ModuleKey;
  const enabled = Boolean(body?.enabled);
  if (!MODULE_KEYS.includes(moduleKey)) {
    return NextResponse.json({ error: "Geçersiz modül" }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx === -1) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    const meta = parseNotes(store.customers[idx].notes);
    meta.modules = { ...(meta.modules ?? {}), [moduleKey]: enabled };
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
    return NextResponse.json({ modules: meta.modules });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  const meta = parseNotes(customer.notes);
  meta.modules = { ...(meta.modules ?? {}), [moduleKey]: enabled };

  await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(meta) } });
  await writeAuditLog({
    action: "MODULE_TOGGLE",
    entityType: "Customer",
    entityId: tenantId,
    actorUserId: auth.user?.userId,
    tenantId,
    detail: `${moduleKey} modülü ${enabled ? "açıldı" : "kapatıldı"}.`,
  });

  return NextResponse.json({ modules: meta.modules });
}
