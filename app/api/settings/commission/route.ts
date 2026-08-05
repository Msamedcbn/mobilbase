import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

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
  const auth = requireRole(["ADMIN", "MANAGER", "ACCOUNTANT"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === tenantId);
    const meta = parseNotes(customer?.notes);
    return NextResponse.json({ cardCommissionRate: meta.cardCommissionRate ?? 0 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  const meta = parseNotes(customer?.notes);
  return NextResponse.json({ cardCommissionRate: meta.cardCommissionRate ?? 0 });
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const body = await req.json();
  const rate = Number(body?.cardCommissionRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return NextResponse.json({ error: "Geçerli bir komisyon oranı giriniz (0-100)" }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx === -1) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    const meta = parseNotes(store.customers[idx].notes);
    meta.cardCommissionRate = rate;
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
    return NextResponse.json({ cardCommissionRate: rate });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  const meta = parseNotes(customer.notes);
  meta.cardCommissionRate = rate;

  await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(meta) } });
  return NextResponse.json({ cardCommissionRate: rate });
}
