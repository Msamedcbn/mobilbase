import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { getSessionUser, requireRole } from "@/lib/auth";
import { fail } from "@/lib/api-response";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

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
    }).filter((r) => r.device?.customer?.tenantId === tenantId);
    return NextResponse.json(repairs);
  }

  const items = await prisma.repairRecord.findMany({
    where: {
      device: {
        customer: {
          tenantId,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      device: {
        include: {
          customer: true,
        },
      },
      invoice: true,
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const device = store.devices.find((d) => d.id === body.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId && c.tenantId === tenantId) : null;
    if (!device || !customer) {
      return fail("Cihaz bulunamadı veya yetkiniz yok", "NOT_FOUND", 404);
    }

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

    const responseItem = {
      ...item,
      device: { ...device, customer },
      invoice: null
    };

    return NextResponse.json(responseItem, { status: 201 });
  }

  // Verify device belongs to tenant
  const device = await prisma.device.findFirst({
    where: {
      id: body.deviceId,
      customer: {
        tenantId,
      },
    },
  });
  if (!device) {
    return fail("Cihaz bulunamadı veya yetkiniz yok", "NOT_FOUND", 404);
  }

  const item = await prisma.repairRecord.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
