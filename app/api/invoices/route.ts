import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, include: { customer: true, repairRecord: true } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.invoice.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
