import { cookies } from "next/headers";
import { fail } from "@/lib/api-response";
import { verifySignedSessionToken } from "@/lib/session";

export type SessionUser = {
  userId: string;
  email: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
  fullName: string;
  tenantId?: string | null;
  expiresAt: number;
  rolePermissions?: Record<string, string[]>;
  activeModules?: Record<string, boolean>;
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

  if (user.role !== "PLATFORM_OWNER" && !user.tenantId) {
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
