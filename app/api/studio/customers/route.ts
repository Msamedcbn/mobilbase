import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback"],
  MANAGER: ["pos", "repairs", "stock", "invoicing"],
  CASHIER: ["pos"],
  TECHNICIAN: ["repairs"],
  ACCOUNTANT: ["invoicing"],
};

function isSaasTenant(notes: string | null | undefined) {
  if (!notes) return false;
  try {
    const parsed = JSON.parse(notes);
    return Boolean(parsed?.isSaaS);
  } catch {
    return false;
  }
}

export async function GET() {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return NextResponse.json({ data: store.customers.filter((c) => isSaasTenant(c.notes)) });
  }

  const items = await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: items.filter((c) => isSaasTenant(c.notes)) });
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = body.email ? String(body.email).trim() : null;

  if (!fullName || !phone) {
    return NextResponse.json({ error: "Firma adi ve telefon zorunludur." }, { status: 400 });
  }

  let notesObj: Record<string, unknown> = {};
  try {
    notesObj = body.notes ? JSON.parse(String(body.notes)) : {};
  } catch {
    return NextResponse.json({ error: "Gecersiz metadata formati." }, { status: 400 });
  }

  const notes = JSON.stringify({
    ...notesObj,
    isSaaS: true,
    rolePermissions: {
      ...DEFAULT_ROLE_PERMISSIONS,
      ...(typeof notesObj.rolePermissions === "object" && notesObj.rolePermissions ? notesObj.rolePermissions : {}),
    },
  });

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const created = {
      id: localId("tenant"),
      nationalId: null,
      fullName,
      phone,
      email,
      notes,
      creditLimit: 0,
    };
    store.customers.unshift(created);
    await writeLocalStore(store);
    return NextResponse.json({ data: created }, { status: 201 });
  }

  const created = await prisma.customer.create({
    data: {
      fullName,
      phone,
      email,
      notes,
      creditLimit: Number(body.creditLimit ?? 0) || 0,
      nationalId: null,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
