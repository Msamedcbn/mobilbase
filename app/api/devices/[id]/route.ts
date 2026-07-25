import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { pickFields } from "@/lib/tenant-guard";

// Device has no tenantId of its own — it inherits the tenant through customerId,
// so letting a caller rewrite customerId is the tenant-escape vector here.
const DEVICE_EDITABLE = [
  "brand",
  "model",
  "imei",
  "serialNumber",
  "storage",
  "color",
  "conditionNote",
  "isSecondHandStock",
] as const;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const item = await prisma.device.findFirst({
    where: {
      id: params.id,
      customer: {
        tenantId,
      },
    },
    include: { customer: true },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.device.findFirst({
    where: {
      id: params.id,
      customer: {
        tenantId,
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const item = await prisma.device.update({
    where: { id: params.id },
    data: pickFields(body, DEVICE_EDITABLE),
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.device.findFirst({
    where: {
      id: params.id,
      customer: {
        tenantId,
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.device.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
