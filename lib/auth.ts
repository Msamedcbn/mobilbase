import { cookies } from "next/headers";
import { fail } from "@/lib/api-response";

export type SessionUser = {
  userId: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
  fullName: string;
  expiresAt: number;
  rolePermissions?: Record<string, string[]>;
  activeModules?: Record<string, boolean>;
};

export function getSessionUser(): SessionUser | null {
  const raw = cookies().get("tp_session")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requireRole(allowed: SessionUser["role"][]) {
  const user = getSessionUser();
  if (!user) {
    return { error: fail("Oturum bulunamadi", "UNAUTHORIZED", 401), user: null };
  }

  if (!allowed.includes(user.role)) {
    return { error: fail("Bu islem icin yetkiniz yok", "FORBIDDEN", 403), user: null };
  }

  return { error: null, user };
}
