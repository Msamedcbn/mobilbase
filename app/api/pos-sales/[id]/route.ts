import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const item = await prisma.posSale.findUnique({ where: { id: params.id }, include: { customer: true } });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const item = await prisma.posSale.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.posSale.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
