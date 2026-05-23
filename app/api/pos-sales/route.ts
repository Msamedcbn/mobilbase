import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.posSale.findMany({ orderBy: { soldAt: "desc" }, include: { customer: true } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.posSale.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
