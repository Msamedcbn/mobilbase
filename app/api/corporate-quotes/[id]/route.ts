import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const status = body.status ? String(body.status) : null;
    const note = body.note !== undefined ? (body.note ? String(body.note) : null) : undefined;

    const allowed = ["DRAFT", "SENT", "APPROVED", "REJECTED", "CANCELED"];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: "Gecersiz durum." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.corporateQuotes) store.corporateQuotes = [];
      const idx = store.corporateQuotes.findIndex((q) => q.id === params.id && q.tenantId === tenantId);
      if (idx === -1) return NextResponse.json({ error: "Teklif bulunamadi." }, { status: 404 });
      const row = store.corporateQuotes[idx];
      if (status) row.status = status as any;
      if (note !== undefined) row.note = note;
      row.updatedAt = new Date().toISOString();
      store.corporateQuotes[idx] = row;
      await writeLocalStore(store);
      return NextResponse.json(row);
    }

    const existing = await prisma.corporateQuote.findFirst({ where: { id: params.id, tenantId } });
    if (!existing) return NextResponse.json({ error: "Teklif bulunamadi." }, { status: 404 });

    const updated = await prisma.corporateQuote.update({
      where: { id: params.id },
      data: {
        status: status ? (status as any) : undefined,
        note,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Teklif guncellenemedi." }, { status: 500 });
  }
}
