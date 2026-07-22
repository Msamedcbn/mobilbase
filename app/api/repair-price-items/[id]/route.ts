import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  const id = params.id;

  const body = await req.json();
  const brand = String(body.brand || "").trim();
  const model = String(body.model || "").trim();
  const category = String(body.category || "").trim();
  const partType = String(body.partType || "").trim();
  const partName = String(body.partName || "").trim();
  const price = Number(body.price || 0);

  if (!brand || !model || !category || !partType || !partName || price <= 0) {
    return NextResponse.json({ error: "Eksik veya geçersiz alanlar var." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.repairPriceItems || []).find((x) => x.id === id && (x.tenantId === tenantId || (!x.tenantId && !tenantId)));
    if (!item) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
    item.brand = brand;
    item.model = model;
    item.category = category;
    item.partType = partType as "original" | "equivalent" | "revision";
    item.partName = partName;
    item.price = price;
    item.updatedAt = new Date().toISOString();
    await writeLocalStore(store);
    return NextResponse.json({ data: item });
  }

  const existing = await prisma.repairPriceItem.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });

  const updated = await prisma.repairPriceItem.update({
    where: { id },
    data: {
      brand,
      model,
      category,
      partType,
      partName,
      price,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;
  const id = params.id;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const before = store.repairPriceItems || [];
    const after = before.filter((x) => !(x.id === id && (x.tenantId === tenantId || (!x.tenantId && !tenantId))));
    if (after.length === before.length) {
      return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
    }
    store.repairPriceItems = after;
    await writeLocalStore(store);
    return NextResponse.json({ success: true });
  }

  const existing = await prisma.repairPriceItem.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });

  await prisma.repairPriceItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

