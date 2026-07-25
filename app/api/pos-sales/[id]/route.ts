import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { pickFields } from "@/lib/tenant-guard";

// Explicit allowlist — the raw body would otherwise let a caller rewrite
// `tenantId` and inject the sale into another tenant's revenue.
const POS_SALE_EDITABLE = [
  "saleNo",
  "totalAmount",
  "discountAmount",
  "finalAmount",
  "status",
  "soldAt",
  "customerId",
  "branchId",
] as const;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const item = await prisma.posSale.findFirst({
    where: { id: params.id, tenantId },
    include: { customer: true },
  });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.posSale.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const item = await prisma.posSale.update({
    where: { id: params.id },
    data: pickFields(body, POS_SALE_EDITABLE),
  });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const existing = await prisma.posSale.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.posSale.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
