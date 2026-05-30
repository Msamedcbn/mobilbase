import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { appUserUpdateSchema } from "@/lib/validations";
import { hashSync } from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;

  try {
    const body = await req.json();
    const parsed = appUserUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Kullanici guncelleme verisi gecersiz", "VALIDATION", 400);

    const targetBranchId = body.branchId !== undefined ? body.branchId : undefined;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const userIndex = (store.users || []).findIndex(
        (u) => u.id === params.id && (auth.user?.role === "PLATFORM_OWNER" ? true : u.tenantId === tenantId)
      );
      if (userIndex === -1) return fail("Kullanıcı bulunamadı", "NOT_FOUND", 404);

      const u = store.users![userIndex];
      if (parsed.data.fullName !== undefined) u.fullName = parsed.data.fullName;
      if (parsed.data.role !== undefined) u.role = parsed.data.role;
      if (parsed.data.isActive !== undefined) u.isActive = parsed.data.isActive;
      if (parsed.data.password) u.passwordHash = hashSync(parsed.data.password, 10);
      if (targetBranchId !== undefined) u.branchId = targetBranchId;
      u.updatedAt = new Date().toISOString();

      await writeLocalStore(store);
      const { passwordHash, ...safeUser } = u;
      return ok(safeUser, 200, "Kullanici guncellendi");
    }

    if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);
    const scoped = await prisma.appUser.findFirst({
      where: { id: params.id, tenantId } as any,
      select: { id: true },
    });
    if (!scoped) return fail("Kullanici bulunamadi", "NOT_FOUND", 404);

    const updateData: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) updateData.fullName = parsed.data.fullName;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role as any;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.password) updateData.passwordHash = hashSync(parsed.data.password, 10);
    if (targetBranchId !== undefined) updateData.branchId = targetBranchId;

    const user = await prisma.appUser.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      action: "APPUSER_UPDATE",
      entityType: "AppUser",
      entityId: user.id,
      actorUserId: auth.user?.userId,
      detail: `email:${user.email} role:${user.role} active:${user.isActive}`,
    });

    return ok(user, 200, "Kullanici guncellendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const initialLength = store.users?.length || 0;
      store.users = (store.users || []).filter(
        (u) => !(u.id === params.id && (auth.user?.role === "PLATFORM_OWNER" ? true : u.tenantId === tenantId))
      );
      if ((store.users?.length || 0) === initialLength) {
        return fail("Kullanıcı bulunamadı", "NOT_FOUND", 404);
      }
      await writeLocalStore(store);
      return ok({ success: true }, 200, "Kullanıcı başarıyla silindi");
    }

    if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);
    const scoped = await prisma.appUser.findFirst({
      where: { id: params.id, tenantId } as any,
      select: { id: true },
    });
    if (!scoped) return fail("Kullanici bulunamadi", "NOT_FOUND", 404);

    const user = await prisma.appUser.delete({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    await writeAuditLog({
      action: "APPUSER_DELETE",
      entityType: "AppUser",
      entityId: user.id,
      actorUserId: auth.user?.userId,
      detail: `email:${user.email} fullName:${user.fullName}`,
    });

    return ok({ success: true }, 200, "Kullanıcı başarıyla silindi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
