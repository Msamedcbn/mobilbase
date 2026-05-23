import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const r = (store.repairs || []).find((x) => x.id === params.id);
    if (!r) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const device = store.devices.find((d) => d.id === r.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;
    return NextResponse.json({
      ...r,
      device: device ? { ...device, customer } : null,
      invoice: null,
    });
  }

  const item = await prisma.repairRecord.findUnique({
    where: { id: params.id },
    include: {
      device: {
        include: {
          customer: true
        }
      },
      invoice: true
    }
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = (store.repairs || []).findIndex((x) => x.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = store.repairs![idx];
    const updated = {
      ...current,
      status: body.status ?? current.status,
      laborCost: body.laborCost !== undefined ? Number(body.laborCost) : current.laborCost,
      partCost: body.partCost !== undefined ? Number(body.partCost) : current.partCost,
      totalCost: body.totalCost !== undefined ? Number(body.totalCost) : current.totalCost,
      issueDescription: body.issueDescription ?? current.issueDescription,
      diagnosisNote: body.diagnosisNote !== undefined ? body.diagnosisNote : current.diagnosisNote,
      completedAt: body.completedAt !== undefined ? body.completedAt : current.completedAt,
    };
    store.repairs![idx] = updated;
    await writeLocalStore(store);

    const device = store.devices.find((d) => d.id === updated.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;

    return NextResponse.json({
      ...updated,
      device: device ? { ...device, customer } : null,
      invoice: null,
    });
  }

  const item = await prisma.repairRecord.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    store.repairs = (store.repairs || []).filter((x) => x.id !== params.id);
    await writeLocalStore(store);
    return NextResponse.json({ ok: true });
  }

  await prisma.repairRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
