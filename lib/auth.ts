import { cookies } from "next/headers";
import { fail } from "@/lib/api-response";
import { verifySignedSessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export type SessionUser = {
  userId: string;
  email: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT" | "STUDIO_OPERATOR";
  fullName: string;
  tenantId?: string | null;
  expiresAt: number;
  rolePermissions?: Record<string, string[]>;
  activeModules?: Record<string, boolean>;
  isTrial?: boolean;
  trialExpiresAt?: string;
};

export function getSessionUser(): SessionUser | null {
  const raw = cookies().get("tp_session")?.value;
  if (!raw) return null;
  const parsed = verifySignedSessionToken(raw);
  return parsed as SessionUser | null;
}

export function requireRole(allowed: SessionUser["role"][]) {
  const user = getSessionUser();
  if (!user) {
    return { error: fail("Oturum bulunamadi", "UNAUTHORIZED", 401), user: null };
  }

  if (user.role !== "PLATFORM_OWNER" && user.role !== "STUDIO_OPERATOR" && !user.tenantId) {
    return {
      error: fail("Kullanici tenant atamasi olmadan bu islemi yapamaz", "FORBIDDEN", 403),
      user: null,
    };
  }

  const hasDirectRole = allowed.includes(user.role);
  const hasPlatformOverride = user.role === "PLATFORM_OWNER" && allowed.includes("ADMIN");
  const hasManagerAdminOverride = user.role === "MANAGER" && allowed.includes("ADMIN");
  if (!hasDirectRole && !hasPlatformOverride && !hasManagerAdminOverride) {
    return { error: fail("Bu islem icin yetkiniz yok", "FORBIDDEN", 403), user: null };
  }

  return { error: null, user };
}

export async function getEffectiveTenantId(user: SessionUser | null): Promise<string | null> {
  if (!user) return null;
  if (user.tenantId) return user.tenantId;

  if (user.role === "PLATFORM_OWNER" || user.role === "STUDIO_OPERATOR") {
    const tenantName = process.env.TENANT_NAME ?? "VibeGSM";
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const customer = store.customers?.find((c) => c.fullName === tenantName);
      return customer?.id ?? null;
    } else {
      const customer = await prisma.customer.findFirst({
        where: { fullName: tenantName },
        select: { id: true },
      });
      return customer?.id ?? null;
    }
  }

  return null;
}

