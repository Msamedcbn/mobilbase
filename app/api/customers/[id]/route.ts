import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";
import { pickFields } from "@/lib/tenant-guard";

const CUSTOMER_EDITABLE = ["fullName", "phone", "email", "nationalId", "notes", "creditLimit"] as const;

/**
 * A tenant is itself a Customer row, and on that row `notes` is not a free-text
 * note — it is the JSON metadata blob holding the tenant's module entitlements,
 * role permissions and isFrozen flag, all owned by the Studio. Letting a tenant
 * admin PUT it here would let them re-enable modules they have not paid for or
 * unfreeze their own suspended account, so `notes` is dropped for the tenant's
 * own root record. Ordinary customer rows keep it as a normal note field.
 */
function buildCustomerUpdate(body: unknown, isOwnTenantRecord: boolean) {
  const allowed = isOwnTenantRecord
    ? (CUSTOMER_EDITABLE.filter((f) => f !== "notes") as unknown as typeof CUSTOMER_EDITABLE)
    : CUSTOMER_EDITABLE;
  return pickFields(body, allowed);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === params.id && (c.tenantId === tenantId || c.id === tenantId));
    return customer ? NextResponse.json(customer) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.customer.findFirst({
    where: {
      id: params.id,
      OR: [
        { tenantId },
        { id: tenantId || "" } // If they request their own tenant details (e.g. settings)
      ]
    }
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === params.id && (c.tenantId === tenantId || c.id === tenantId));
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = {
      ...store.customers[idx],
      fullName: body.fullName ?? store.customers[idx].fullName,
      phone: body.phone ?? store.customers[idx].phone,
      email: body.email !== undefined ? body.email : store.customers[idx].email,
      notes:
        body.notes !== undefined && params.id !== tenantId ? body.notes : store.customers[idx].notes,
      creditLimit: body.creditLimit !== undefined ? Number(body.creditLimit) : store.customers[idx].creditLimit,
    };
    store.customers[idx] = updated;
    await writeLocalStore(store);
    return NextResponse.json(updated);
  }

  const existing = await prisma.customer.findFirst({
    where: {
      id: params.id,
      OR: [
        { tenantId },
        { id: tenantId || "" }
      ]
    }
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.customer.update({
    where: { id: params.id },
    data: buildCustomerUpdate(body, params.id === tenantId),
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === params.id && c.tenantId === tenantId);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    store.customers = store.customers.filter((c) => c.id !== params.id);
    if (store.devices) store.devices = store.devices.filter((d) => d.customerId !== params.id);
    if (store.buybacks) store.buybacks = store.buybacks.filter((b) => b.customerId !== params.id);
    if (store.accountEntries) store.accountEntries = store.accountEntries.filter((e) => e.customerId !== params.id);
    await writeLocalStore(store);
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.customer.findFirst({
    where: { id: params.id, tenantId }
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
