import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const repairs = (store.repairs || []).map((r) => {
      const device = store.devices.find((d) => d.id === r.deviceId);
      const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;
      return {
        ...r,
        device: device
          ? {
              ...device,
              customer,
            }
          : null,
        invoice: null,
      };
    });
    return NextResponse.json(repairs);
  }

  const items = await prisma.repairRecord.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      device: {
        include: {
          customer: true
        }
      },
      invoice: true
    }
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (!store.repairs) store.repairs = [];
    const newId = localId("rep");
    const item = {
      id: newId,
      deviceId: body.deviceId,
      issueDescription: body.issueDescription,
      diagnosisNote: body.diagnosisNote ?? null,
      laborCost: Number(body.laborCost ?? 0),
      partCost: Number(body.partCost ?? 0),
      totalCost: Number(body.totalCost ?? 0),
      status: body.status ?? "RECEIVED",
      receivedAt: new Date().toISOString(),
      completedAt: body.status === "DELIVERED" ? new Date().toISOString() : null,
      branchId: body.branchId ?? "branch-kadikoy"
    };
    store.repairs.unshift(item);
    await writeLocalStore(store);

    const device = store.devices.find((d) => d.id === item.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;
    const responseItem = {
      ...item,
      device: device ? { ...device, customer } : null,
      invoice: null
    };

    return NextResponse.json(responseItem, { status: 201 });
  }

  const item = await prisma.repairRecord.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
