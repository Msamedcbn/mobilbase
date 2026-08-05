import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireTenant } from "@/lib/tenant-guard";

async function getTenantCustomerById(tenantId: string) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return store.customers.find((c) => c.id === tenantId) ?? null;
  }
  return prisma.customer.findUnique({ where: { id: tenantId } });
}

async function saveTenantCustomerNotes(customerId: string, notesStr: string) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      store.customers[idx].notes = notesStr;
      await writeLocalStore(store);
    }
  } else {
    await prisma.customer.update({ where: { id: customerId }, data: { notes: notesStr } });
  }
}

function parseMetadata(notes: string | null | undefined) {
  if (!notes) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = requireTenant(["ADMIN", "MANAGER", "ACCOUNTANT"]);
  if (guard.error) return guard.error;

  const body = await req.json();
  const customer = await getTenantCustomerById(guard.ctx.tenantId);
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const metadata = parseMetadata(customer.notes);
  const debts: any[] = metadata.supplierDebts || [];
  const idx = debts.findIndex((d) => d.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

  const current = debts[idx];

  if (typeof body?.paidAmount === "number" && Number.isFinite(body.paidAmount)) {
    const paidAmount = Math.max(0, Math.min(body.paidAmount, current.amount));
    debts[idx] = {
      ...current,
      paidAmount,
      isPaid: paidAmount >= current.amount,
      updatedAt: new Date().toISOString(),
    };
  } else if (typeof body?.isPaid === "boolean") {
    debts[idx] = {
      ...current,
      isPaid: body.isPaid,
      paidAmount: body.isPaid ? current.amount : current.paidAmount,
      updatedAt: new Date().toISOString(),
    };
  } else {
    return NextResponse.json({ error: "Geçersiz güncelleme" }, { status: 400 });
  }

  metadata.supplierDebts = debts;
  await saveTenantCustomerNotes(customer.id, JSON.stringify(metadata));

  return NextResponse.json({ data: debts[idx] });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = requireTenant(["ADMIN", "MANAGER", "ACCOUNTANT"]);
  if (guard.error) return guard.error;

  const customer = await getTenantCustomerById(guard.ctx.tenantId);
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const metadata = parseMetadata(customer.notes);
  const debts: any[] = metadata.supplierDebts || [];
  const next = debts.filter((d) => d.id !== params.id);
  if (next.length === debts.length) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  metadata.supplierDebts = next;
  await saveTenantCustomerNotes(customer.id, JSON.stringify(metadata));

  return NextResponse.json({ success: true });
}
