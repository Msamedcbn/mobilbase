import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { hashSync } from "bcryptjs";

const ALLOWED_USER_ROLES = ["PLATFORM_OWNER", "ADMIN", "MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"] as const;
type AllowedUserRole = (typeof ALLOWED_USER_ROLES)[number];

const DEFAULT_ROLE_PERMISSIONS = {
  PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
  MANAGER: ["pos", "repairs", "stock", "invoicing", "buyback", "branches"],
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
  const auth = requireRole(["PLATFORM_OWNER", "STUDIO_OPERATOR"]);
  if (auth.error) return auth.error;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return NextResponse.json({ data: store.customers.filter((c) => isSaasTenant(c.notes)) });
  }

  const items = await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: items.filter((c) => isSaasTenant(c.notes)) });
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const initialPassword = body.initialPassword ? String(body.initialPassword).trim() : "";
  const authorizedPerson = body.authorizedPerson ? String(body.authorizedPerson).trim() : "";
  const initialUserRoleRaw = String(body.initialUserRole ?? "MANAGER").toUpperCase();
  const initialUserRole: AllowedUserRole = (ALLOWED_USER_ROLES as readonly string[]).includes(initialUserRoleRaw)
    ? (initialUserRoleRaw as AllowedUserRole)
    : "MANAGER";

  if (!fullName || !phone) {
    return NextResponse.json({ error: "Firma adi ve telefon zorunludur." }, { status: 400 });
  }

  let notesObj: Record<string, unknown> = {};
  try {
    notesObj = body.notes ? JSON.parse(String(body.notes)) : {};
  } catch {
    return NextResponse.json({ error: "Geçersiz metadata formati." }, { status: 400 });
  }

  const notes = JSON.stringify({
    ...notesObj,
    isSaaS: true,
    isFrozen: typeof (notesObj as any).isFrozen === "boolean" ? (notesObj as any).isFrozen : false,
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

    if (email && initialPassword) {
      const passwordHash = hashSync(initialPassword, 10);
      const users = store.users ?? [];
      const existingUserIndex = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
      const localRole =
        initialUserRole === "PLATFORM_OWNER" ||
        initialUserRole === "ADMIN" ||
        initialUserRole === "MANAGER" ||
        initialUserRole === "CASHIER" ||
        initialUserRole === "TECHNICIAN" ||
        initialUserRole === "ACCOUNTANT"
          ? initialUserRole
          : "CASHIER";
      if (existingUserIndex >= 0) {
        users[existingUserIndex].passwordHash = passwordHash;
        users[existingUserIndex].isActive = true;
        users[existingUserIndex].fullName = authorizedPerson || users[existingUserIndex].fullName;
        users[existingUserIndex].role = localRole;
        users[existingUserIndex].tenantId = created.id;
      } else {
        users.push({
          id: localId("user"),
          fullName: authorizedPerson || fullName,
          email: email.toLowerCase(),
          role: localRole,
          passwordHash,
          isActive: true,
          branchId: null,
          tenantId: created.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      store.users = users;
    }

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

  if (email && initialPassword) {
    const passwordHash = hashSync(initialPassword, 10);
    await prisma.appUser.upsert({
      where: { email: email.toLowerCase() },
      update: {
        fullName: authorizedPerson || fullName,
        passwordHash,
        role: initialUserRole as any,
        isActive: true,
        tenantId: created.id,
      } as any,
      create: {
        fullName: authorizedPerson || fullName,
        email: email.toLowerCase(),
        passwordHash,
        role: initialUserRole as any,
        isActive: true,
        tenantId: created.id,
      } as any,
    });
  }

  return NextResponse.json({ data: created }, { status: 201 });
}

