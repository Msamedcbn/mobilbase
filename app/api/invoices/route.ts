import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const items = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { issuedAt: "desc" },
    include: { customer: true, repairRecord: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  try {
    const body = await req.json();
    const item = await prisma.invoice.create({
      data: {
        ...body,
        tenantId,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fatura oluşturulurken hata oluştu" }, { status: 500 });
  }
}
