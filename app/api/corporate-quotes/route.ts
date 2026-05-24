import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const rows = (store.corporateQuotes || [])
      .filter((q) => q.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(rows);
  }

  const quotes = await prisma.corporateQuote.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const companyName = String(body.companyName || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const discountAmount = Number(body.discountAmount || 0);
    const taxRate = Number(body.taxRate || 0);
    const note = body.note ? String(body.note) : null;

    if (!companyName) return NextResponse.json({ error: "Firma adi zorunludur." }, { status: 400 });
    if (items.length === 0) return NextResponse.json({ error: "En az 1 kalem girilmelidir." }, { status: 400 });

    const subtotal = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
    const taxAmount = Math.max(0, (subtotal - discountAmount) * (taxRate / 100));
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);
    const quoteNo = `KTF-${Date.now()}`;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.corporateQuotes) store.corporateQuotes = [];
      const row = {
        id: localId("corp-quote"),
        tenantId,
        quoteNo,
        companyName,
        contactName: body.contactName ? String(body.contactName) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        validUntil: body.validUntil ? String(body.validUntil) : null,
        status: "DRAFT" as const,
        itemsJson: JSON.stringify(items),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        note,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.corporateQuotes.unshift(row);
      await writeLocalStore(store);
      return NextResponse.json(row, { status: 201 });
    }

    const quote = await prisma.corporateQuote.create({
      data: {
        tenantId,
        quoteNo,
        companyName,
        contactName: body.contactName ? String(body.contactName) : null,
        contactPhone: body.contactPhone ? String(body.contactPhone) : null,
        contactEmail: body.contactEmail ? String(body.contactEmail) : null,
        validUntil: body.validUntil ? new Date(String(body.validUntil)) : null,
        status: "DRAFT",
        itemsJson: JSON.stringify(items),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        note,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Teklif kaydedilemedi." }, { status: 500 });
  }
}
