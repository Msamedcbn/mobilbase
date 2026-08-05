import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

function parseNotes(notesStr: string | null | undefined) {
  if (!notesStr) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(notesStr);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const customer = isDbDisabledMode()
    ? (await readLocalStore()).customers.find((c) => c.id === tenantId)
    : await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });

  const meta = parseNotes(customer?.notes);
  return NextResponse.json({
    invoiceTemplate: {
      businessName: meta.invoiceTemplate?.businessName ?? "",
      taxOffice: meta.invoiceTemplate?.taxOffice ?? "",
      taxNo: meta.invoiceTemplate?.taxNo ?? "",
      footerNote: meta.invoiceTemplate?.footerNote ?? "",
    },
  });
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const body = await req.json();
  const invoiceTemplate = {
    businessName: typeof body?.businessName === "string" ? body.businessName.trim().slice(0, 120) : "",
    taxOffice: typeof body?.taxOffice === "string" ? body.taxOffice.trim().slice(0, 80) : "",
    taxNo: typeof body?.taxNo === "string" ? body.taxNo.trim().slice(0, 20) : "",
    footerNote: typeof body?.footerNote === "string" ? body.footerNote.trim().slice(0, 200) : "",
  };

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx === -1) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    const meta = parseNotes(store.customers[idx].notes);
    meta.invoiceTemplate = invoiceTemplate;
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
    return NextResponse.json({ invoiceTemplate });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  const meta = parseNotes(customer.notes);
  meta.invoiceTemplate = invoiceTemplate;
  await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(meta) } });

  return NextResponse.json({ invoiceTemplate });
}
