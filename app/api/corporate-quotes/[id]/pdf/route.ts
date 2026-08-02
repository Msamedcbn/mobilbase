import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { prisma } from "@/lib/prisma";
import { generateCorporateQuotePdf } from "@/lib/corporate-quote-pdf";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const q = (store.corporateQuotes || []).find((x) => x.id === params.id && x.tenantId === tenantId);
    if (!q) return new Response(JSON.stringify({ error: "Teklif bulunamadi." }), { status: 404 });
    const tenant = store.customers.find((c) => c.id === tenantId);
    const file = await generateCorporateQuotePdf({
      quoteNo: q.quoteNo,
      tenantName: tenant?.fullName || null,
      companyName: q.companyName,
      contactName: q.contactName,
      contactPhone: q.contactPhone,
      contactEmail: q.contactEmail,
      validUntil: q.validUntil || null,
      createdAt: q.createdAt,
      items: JSON.parse(q.itemsJson || "[]"),
      subtotal: Number(q.subtotal),
      discountAmount: Number(q.discountAmount),
      taxAmount: Number(q.taxAmount),
      totalAmount: Number(q.totalAmount),
      note: q.note || null,
    });
    return new Response(new Uint8Array(file.content), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${file.filename}\"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const q = await prisma.corporateQuote.findFirst({ where: { id: params.id, tenantId } });
  if (!q) return new Response(JSON.stringify({ error: "Teklif bulunamadi." }), { status: 404 });
  const tenant = tenantId ? await prisma.customer.findUnique({ where: { id: tenantId }, select: { fullName: true } }) : null;

  const file = await generateCorporateQuotePdf({
    quoteNo: q.quoteNo,
    tenantName: tenant?.fullName || null,
    companyName: q.companyName,
    contactName: q.contactName,
    contactPhone: q.contactPhone,
    contactEmail: q.contactEmail,
    validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    createdAt: q.createdAt.toISOString(),
    items: JSON.parse(q.itemsJson || "[]"),
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    taxAmount: Number(q.taxAmount),
    totalAmount: Number(q.totalAmount),
    note: q.note || null,
  });

  return new Response(new Uint8Array(file.content), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${file.filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
