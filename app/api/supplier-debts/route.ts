import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireTenant } from "@/lib/tenant-guard";

type SupplierDebtEntry = {
  id: string;
  supplierName: string;
  amount: number;
  paidAmount: number;
  description: string | null;
  dueDate: string | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

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

export async function GET() {
  const guard = requireTenant();
  if (guard.error) return guard.error;

  const customer = await getTenantCustomerById(guard.ctx.tenantId);
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const metadata = parseMetadata(customer.notes);
  const debts: SupplierDebtEntry[] = metadata.supplierDebts || [];
  return NextResponse.json({ data: debts });
}

export async function POST(req: Request) {
  const guard = requireTenant(["ADMIN", "MANAGER", "ACCOUNTANT"]);
  if (guard.error) return guard.error;

  const body = await req.json();
  const supplierName = typeof body?.supplierName === "string" ? body.supplierName.trim() : "";
  const amount = Number(body?.amount);
  const dueDate = typeof body?.dueDate === "string" && body.dueDate ? body.dueDate : null;
  const description = typeof body?.description === "string" && body.description.trim() ? body.description.trim() : null;

  if (!supplierName) {
    return NextResponse.json({ error: "Tedarikçi adı zorunludur" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Geçerli bir borç tutarı giriniz" }, { status: 400 });
  }

  const customer = await getTenantCustomerById(guard.ctx.tenantId);
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const metadata = parseMetadata(customer.notes);
  const now = new Date().toISOString();
  const entry: SupplierDebtEntry = {
    id: "sd-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    supplierName,
    amount,
    paidAmount: 0,
    description,
    dueDate,
    isPaid: false,
    createdAt: now,
    updatedAt: now,
  };

  metadata.supplierDebts = [entry, ...(metadata.supplierDebts || [])];
  await saveTenantCustomerNotes(customer.id, JSON.stringify(metadata));

  return NextResponse.json({ data: entry });
}
