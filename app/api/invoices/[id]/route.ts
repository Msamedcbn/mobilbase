import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { pickFields } from "@/lib/tenant-guard";

// Explicit allowlist: passing the raw body through would let a caller set
// `tenantId` and move the invoice into another tenant's books.
const INVOICE_EDITABLE = ["invoiceNo", "totalAmount", "paidAmount", "dueAmount", "dueDate", "issuedAt"] as const;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const item = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId },
    include: { customer: true, repairRecord: true },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.invoice.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const item = await prisma.invoice.update({
    where: { id: params.id },
    data: pickFields(body, INVOICE_EDITABLE),
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.invoice.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
