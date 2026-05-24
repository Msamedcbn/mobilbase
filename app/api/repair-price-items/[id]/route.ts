import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

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
