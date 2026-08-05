import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, getEffectiveTenantId } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

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
    branding: { accentColor: meta.branding?.accentColor ?? "", logoUrl: meta.branding?.logoUrl ?? "" },
  });
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = await getEffectiveTenantId(auth.user);
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });

  const body = await req.json();
  const accentColor = typeof body?.accentColor === "string" ? body.accentColor.trim() : "";
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim() : "";

  if (accentColor && !HEX_COLOR_RE.test(accentColor)) {
    return NextResponse.json({ error: "Renk #RRGGBB formatında olmalı (örn: #2563eb)" }, { status: 400 });
  }
  if (logoUrl && !/^https:\/\//.test(logoUrl)) {
    return NextResponse.json({ error: "Logo adresi https:// ile başlamalı" }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx === -1) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
    const meta = parseNotes(store.customers[idx].notes);
    meta.branding = { accentColor: accentColor || undefined, logoUrl: logoUrl || undefined };
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
    return NextResponse.json({ branding: meta.branding });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } });
  if (!customer) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 404 });
  const meta = parseNotes(customer.notes);
  meta.branding = { accentColor: accentColor || undefined, logoUrl: logoUrl || undefined };
  await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(meta) } });

  return NextResponse.json({ branding: meta.branding });
}
