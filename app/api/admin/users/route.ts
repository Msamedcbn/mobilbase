import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { appUserCreateSchema } from "@/lib/validations";
import { hashSync } from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const users = (store.users || [])
      .filter((u) => (auth.user?.role === "PLATFORM_OWNER" ? true : u.tenantId === tenantId))
      .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      branchId: u.branchId,
      baseSalary: (u as any).baseSalary ?? 0,
      commissionBasis: (u as any).commissionBasis ?? "NONE",
      commissionPct: (u as any).commissionPct ?? 0,
      createdAt: u.createdAt || new Date().toISOString(),
      updatedAt: u.updatedAt || new Date().toISOString(),
    }));
    return ok(users);
  }

  try {
    if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

    const users = await prisma.appUser.findMany({
      where: { tenantId } as any,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        baseSalary: true,
        commissionBasis: true,
        commissionPct: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return ok(users);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = appUserCreateSchema.safeParse(body);
    if (!parsed.success) return fail("Kullanici verisi geçersiz", "VALIDATION", 400);

    const payloadEmail = parsed.data.email.toLowerCase().trim();
    const tenantId = auth.user?.tenantId ?? null;
    if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const existing = (store.users || []).find((u) => u.email.toLowerCase() === payloadEmail);
      if (existing) return fail("Bu e-posta adresiyle zaten bir kullanıcı kayıtlı", "CONFLICT", 409);

      const created = {
        id: localId("usr"),
        fullName: parsed.data.fullName,
        email: payloadEmail,
        role: parsed.data.role,
        passwordHash: hashSync(parsed.data.password, 10),
        isActive: parsed.data.isActive ?? true,
        branchId: (body as any).branchId || null,
        baseSalary: parsed.data.baseSalary ?? 0,
        commissionBasis: parsed.data.commissionBasis ?? "NONE",
        commissionPct: parsed.data.commissionPct ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!store.users) store.users = [];
      store.users.unshift(created);
      await writeLocalStore(store);

      const { passwordHash, ...safeUser } = created;
      return ok(safeUser, 201, "Kullanici olusturuldu");
    }

    const existingDb = await prisma.appUser.findUnique({ where: { email: payloadEmail } });
    if (existingDb) return fail("Bu e-posta adresiyle zaten bir kullanıcı kayıtlı", "CONFLICT", 409);

    const user = await prisma.appUser.create({
      data: {
        fullName: parsed.data.fullName,
        email: payloadEmail,
        role: parsed.data.role as any,
        passwordHash: hashSync(parsed.data.password, 10),
        isActive: parsed.data.isActive ?? true,
        branchId: (body as any).branchId || null,
        baseSalary: parsed.data.baseSalary ?? 0,
        commissionBasis: (parsed.data.commissionBasis ?? "NONE") as any,
        commissionPct: parsed.data.commissionPct ?? 0,
        tenantId,
      } as any,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        baseSalary: true,
        commissionBasis: true,
        commissionPct: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      action: "APPUSER_CREATE",
      entityType: "AppUser",
      entityId: user.id,
      actorUserId: auth.user?.userId,
      detail: `email:${user.email} role:${user.role}`,
    });

    return ok(user, 201, "Kullanici olusturuldu");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

