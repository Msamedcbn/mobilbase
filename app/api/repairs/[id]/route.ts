import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { getSessionUser, requireRole, getEffectiveTenantId } from "@/lib/auth";
import { verifyRepairTrackingToken } from "@/lib/repair-tracking";

// Shape returned to an anonymous customer holding a valid tracking token —
// deliberately narrower than the staff view (no tenantId, no raw notes) since
// this response is reachable without a session.
function toPublicRepairView(r: any, device: any, customer: any, invoice: any) {
  return {
    id: r.id,
    deviceId: r.deviceId,
    issueDescription: r.issueDescription,
    diagnosisNote: r.diagnosisNote,
    laborCost: r.laborCost,
    partCost: r.partCost,
    totalCost: r.totalCost,
    status: r.status,
    receivedAt: r.receivedAt,
    completedAt: r.completedAt,
    branchId: r.branchId,
    device: device
      ? {
          id: device.id,
          brand: device.brand,
          model: device.model,
          storage: device.storage,
          imei: device.imei,
          conditionNote: device.conditionNote,
          customer: customer ? { fullName: customer.fullName, phone: customer.phone } : null,
        }
      : null,
    invoice: invoice ? { id: invoice.id, invoiceNo: invoice.invoiceNo } : null,
  };
}

// DELIVERED and CANCELED are terminal: once a repair is delivered it has already
// created an Invoice/Transaction/bank-balance effect with no reliable link back to
// reverse, and once canceled there's nothing left to action. Without this guard,
// DELIVERED -> CANCELED -> DELIVERED re-triggers invoice creation, which either
// crashes (Invoice.repairRecordId is @unique in DB mode) or silently duplicates
// income/debt entries (local-store mode).
const REPAIR_STATUS_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["IN_PROGRESS", "WAITING_PART", "READY", "CANCELED"],
  IN_PROGRESS: ["WAITING_PART", "READY", "CANCELED"],
  WAITING_PART: ["IN_PROGRESS", "READY", "CANCELED"],
  READY: ["IN_PROGRESS", "DELIVERED", "CANCELED"],
  DELIVERED: [],
  CANCELED: [],
};

function isValidRepairStatusTransition(from: string, to: string) {
  if (from === to) return true;
  return REPAIR_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  const token = new URL(req.url).searchParams.get("t");
  const hasValidTrackingToken = !user && verifyRepairTrackingToken(params.id, token);

  if (!user && !hasValidTrackingToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (hasValidTrackingToken) {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const r = (store.repairs || []).find((x) => x.id === params.id);
      if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const device = store.devices.find((d) => d.id === r.deviceId);
      const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;
      return NextResponse.json(toPublicRepairView(r, device, customer, null));
    }

    const item = await prisma.repairRecord.findUnique({
      where: { id: params.id },
      include: { device: { include: { customer: true } }, invoice: true },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toPublicRepairView(item, item.device, item.device?.customer, item.invoice));
  }

  const tenantId = await getEffectiveTenantId(user);

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const r = (store.repairs || []).find((x) => x.id === params.id);
    if (!r) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const device = store.devices.find((d) => d.id === r.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId && c.tenantId === tenantId) : null;
    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...r,
      device: device ? { ...device, customer } : null,
      invoice: null,
    });
  }

  const item = await prisma.repairRecord.findFirst({
    where: {
      id: params.id,
      device: {
        customer: {
          tenantId,
        },
      },
    },
    include: {
      device: {
        include: {
          customer: true,
        },
      },
      invoice: true,
    },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);

  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = (store.repairs || []).findIndex((x) => x.id === params.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = store.repairs![idx];
    const device = store.devices.find((d) => d.id === current.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId && c.tenantId === tenantId) : null;
    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.status !== undefined && !isValidRepairStatusTransition(current.status, body.status)) {
      return NextResponse.json(
        { error: `Durum geçişi geçersiz: ${current.status} -> ${body.status}` },
        { status: 400 }
      );
    }

    const isDelivering = body.status === "DELIVERED" && current.status !== "DELIVERED";

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

    if (isDelivering) {
      const totalAmount = Number(updated.totalCost);
      const payMethod = body.paymentMethod || "CASH";
      const bankId = body.bankAccountId || null;
      const trNo = `TR-REP-${Date.now()}`;

      // Update bank account balance
      if ((payMethod === "CASH" || payMethod === "CREDIT_CARD") && bankId) {
        if (!store.bankAccounts) store.bankAccounts = [];
        const bankIdx = store.bankAccounts.findIndex((b) => b.id === bankId);
        if (bankIdx !== -1) {
          store.bankAccounts[bankIdx].balance = Number(store.bankAccounts[bankIdx].balance) + totalAmount;
        }
      }

      // If veresiye (on account), add an account entry
      if (payMethod === "ON_ACCOUNT") {
        if (!store.accountEntries) store.accountEntries = [];
        store.accountEntries.push({
          id: `entry-${Math.random().toString(36).substr(2, 9)}`,
          customerId: customer.id,
          type: "DEBIT",
          amount: totalAmount,
          description: `${trNo} no'lu teknik servis onarım borcu`,
          createdAt: new Date().toISOString(),
        });
      }

      // Create transaction record
      if (!store.transactions) store.transactions = [];
      store.transactions.unshift({
        id: `tr-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        transactionNo: trNo,
        type: "INCOME",
        paymentMethod: payMethod,
        customerId: customer.id,
        totalAmount,
        note: `[Servis Onarımı] Servis No: ${current.id} / Cihaz: ${device?.brand || ""} ${device?.model || ""}`,
        createdAt: new Date().toISOString(),
        branchId: current.branchId ?? "branch-kadikoy",
        bankAccountId: bankId,
      });
    }

    await writeLocalStore(store);

    return NextResponse.json({
      ...updated,
      device: device ? { ...device, customer } : null,
      invoice: null,
    });
  }

  const existing = await prisma.repairRecord.findFirst({
    where: {
      id: params.id,
      device: {
        customer: {
          tenantId,
        },
      },
    },
    include: {
      device: {
        include: {
          customer: true,
        },
      },
      invoice: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status !== undefined && !isValidRepairStatusTransition(existing.status, body.status)) {
    return NextResponse.json(
      { error: `Durum geçişi geçersiz: ${existing.status} -> ${body.status}` },
      { status: 400 }
    );
  }

  const isDelivering = body.status === "DELIVERED" && existing.status !== "DELIVERED";

  const { paymentMethod, bankAccountId, ...updateData } = body;

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.repairRecord.update({
      where: { id: params.id },
      data: updateData,
    });

    if (isDelivering) {
      const totalAmount = Number(item.totalCost);
      const payMethod = paymentMethod || "CASH";
      const bankId = bankAccountId || null;
      const trNo = `TR-REP-${Date.now()}`;

      // Create transaction
      await tx.transaction.create({
        data: {
          tenantId,
          transactionNo: trNo,
          type: "INCOME",
          paymentMethod: payMethod,
          customerId: existing.device.customerId,
          totalAmount,
          note: `[Servis Onarımı] Servis No: ${item.id} / Cihaz: ${existing.device.brand} ${existing.device.model}`,
          bankAccountId: bankId,
          branchId: item.branchId,
        },
      });

      // Update bank account balance
      if ((payMethod === "CASH" || payMethod === "CREDIT_CARD") && bankId) {
        await tx.bankAccount.update({
          where: { id: bankId },
          data: { balance: { increment: totalAmount } },
        });
      }

      // Create AccountEntry if ON_ACCOUNT
      if (payMethod === "ON_ACCOUNT") {
        await tx.accountEntry.create({
          data: {
            customerId: existing.device.customerId,
            type: "DEBIT",
            amount: totalAmount,
            description: `${trNo} no'lu teknik servis onarım borcu`,
          },
        });
      }

      // Create Invoice
      await tx.invoice.create({
        data: {
          tenantId,
          customerId: existing.device.customerId,
          repairRecordId: item.id,
          invoiceNo: `INV-${Date.now()}`,
          totalAmount,
          paidAmount: payMethod === "ON_ACCOUNT" ? 0 : totalAmount,
          dueAmount: payMethod === "ON_ACCOUNT" ? totalAmount : 0,
        },
      });
    }

    return item;
  });

  return NextResponse.json(result);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const r = (store.repairs || []).find((x) => x.id === params.id);
    if (!r) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const device = store.devices.find((d) => d.id === r.deviceId);
    const customer = device ? store.customers.find((c) => c.id === device.customerId && c.tenantId === tenantId) : null;
    if (!customer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    store.repairs = store.repairs.filter((x) => x.id !== params.id);
    await writeLocalStore(store);
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.repairRecord.findFirst({
    where: {
      id: params.id,
      device: {
        customer: {
          tenantId,
        },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.repairRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
