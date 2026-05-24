import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const rows = (store.repairPriceItems || []).filter((x) => x.tenantId === tenantId || (!x.tenantId && !tenantId));
    return NextResponse.json({ data: rows });
  }

  const rows = await prisma.repairPriceItem.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  const body = await req.json();
  const brand = String(body.brand || "").trim();
  const model = String(body.model || "").trim();
  const category = String(body.category || "").trim();
  const partType = String(body.partType || "").trim();
  const partName = String(body.partName || "").trim();
  const price = Number(body.price || 0);

  if (!brand || !model || !category || !partType || !partName || price <= 0) {
    return NextResponse.json({ error: "Eksik veya gecersiz alanlar var." }, { status: 400 });
  }

  if (!["original", "equivalent", "revision"].includes(partType)) {
    return NextResponse.json({ error: "Gecersiz parca tipi." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    if (!store.repairPriceItems) store.repairPriceItems = [];

    const row = {
      id: localId("repair-price"),
      tenantId,
      brand,
      model,
      category,
      partType: partType as "original" | "equivalent" | "revision",
      partName,
      price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.repairPriceItems.unshift(row);
    await writeLocalStore(store);
    return NextResponse.json({ data: row }, { status: 201 });
  }

  const created = await prisma.repairPriceItem.create({
    data: {
      tenantId,
      brand,
      model,
      category,
      partType,
      partName,
      price,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
