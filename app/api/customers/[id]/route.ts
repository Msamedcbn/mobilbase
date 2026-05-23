import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === params.id);
    return customer ? NextResponse.json(customer) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.customer.findUnique({ where: { id: params.id } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === params.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = {
      ...store.customers[idx],
      fullName: body.fullName ?? store.customers[idx].fullName,
      phone: body.phone ?? store.customers[idx].phone,
      email: body.email !== undefined ? body.email : store.customers[idx].email,
      notes: body.notes !== undefined ? body.notes : store.customers[idx].notes,
      creditLimit: body.creditLimit !== undefined ? Number(body.creditLimit) : store.customers[idx].creditLimit,
    };
    store.customers[idx] = updated;
    await writeLocalStore(store);
    return NextResponse.json(updated);
  }

  const item = await prisma.customer.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    store.customers = store.customers.filter((c) => c.id !== params.id);
    if (store.devices) store.devices = store.devices.filter((d) => d.customerId !== params.id);
    if (store.buybacks) store.buybacks = store.buybacks.filter((b) => b.customerId !== params.id);
    if (store.accountEntries) store.accountEntries = store.accountEntries.filter((e) => e.customerId !== params.id);
    await writeLocalStore(store);
    return NextResponse.json({ ok: true });
  }

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
