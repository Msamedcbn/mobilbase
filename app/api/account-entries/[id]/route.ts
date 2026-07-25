import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole, getSessionUser } from "@/lib/auth";
import { pickFields } from "@/lib/tenant-guard";

// AccountEntry inherits its tenant via customerId, so customerId is deliberately
// not editable here — reassigning it would move a ledger line to another tenant.
const ACCOUNT_ENTRY_EDITABLE = ["type", "amount", "description", "dueDate", "bankAccountId"] as const;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const entry = (store.accountEntries || []).find((e) => e.id === params.id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = store.customers.find((c) => c.id === entry.customerId);
    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 403 });
    }
    return NextResponse.json({ ...entry, customer });
  }

  const item = await prisma.accountEntry.findFirst({
    where: { id: params.id, customer: { tenantId } },
    include: { customer: true },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = (store.accountEntries || []).findIndex((e) => e.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entry = store.accountEntries![idx];
    const customer = store.customers.find((c) => c.id === entry.customerId);
    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 403 });
    }

    const updated = {
      ...entry,
      type: body.type ?? entry.type,
      amount: body.amount !== undefined ? Number(body.amount) : entry.amount,
      description: body.description !== undefined ? body.description : entry.description,
    };
    store.accountEntries![idx] = updated;
    await writeLocalStore(store);
    return NextResponse.json(updated);
  }

  const existing = await prisma.accountEntry.findFirst({
    where: { id: params.id, customer: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.accountEntry.update({
    where: { id: params.id },
    data: pickFields(body, ACCOUNT_ENTRY_EDITABLE),
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const entry = (store.accountEntries || []).find((e) => e.id === params.id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = store.customers.find((c) => c.id === entry.customerId);
    if (!customer || customer.tenantId !== tenantId) {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 403 });
    }

    if (store.accountEntries) {
      store.accountEntries = store.accountEntries.filter((e) => e.id !== params.id);
      await writeLocalStore(store);
    }
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.accountEntry.findFirst({
    where: { id: params.id, customer: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.accountEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
