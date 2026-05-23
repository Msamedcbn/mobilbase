import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const entry = (store.accountEntries || []).find((e) => e.id === params.id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const customer = store.customers.find((c) => c.id === entry.customerId);
    return NextResponse.json({ ...entry, customer });
  }

  const item = await prisma.accountEntry.findUnique({ where: { id: params.id }, include: { customer: true } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = (store.accountEntries || []).findIndex((e) => e.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = {
      ...store.accountEntries![idx],
      customerId: body.customerId ?? store.accountEntries![idx].customerId,
      type: body.type ?? store.accountEntries![idx].type,
      amount: body.amount !== undefined ? Number(body.amount) : store.accountEntries![idx].amount,
      description: body.description !== undefined ? body.description : store.accountEntries![idx].description,
    };
    store.accountEntries![idx] = updated;
    await writeLocalStore(store);
    return NextResponse.json(updated);
  }

  const item = await prisma.accountEntry.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (store.accountEntries) {
      store.accountEntries = store.accountEntries.filter((e) => e.id !== params.id);
      await writeLocalStore(store);
    }
    return NextResponse.json({ ok: true });
  }

  await prisma.accountEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
