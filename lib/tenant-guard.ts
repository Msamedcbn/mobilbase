import { fail } from "@/lib/api-response";
import { getSessionUser, requireRole, type SessionUser } from "@/lib/auth";

/**
 * Tenant scoping helpers.
 *
 * Historically every route re-implemented "read tenantId off the session, remember
 * to put it in the where clause" by hand, and the ones that forgot became IDOR
 * bugs (see the tenant-isolation fixes in the git log). These helpers exist so a
 * new route gets the scoping for free and a missing tenant is a hard failure
 * instead of a silently unfiltered query.
 */

export type TenantContext = {
  user: SessionUser;
  tenantId: string;
};

type GuardResult =
  | { error: ReturnType<typeof fail>; ctx: null }
  | { error: null; ctx: TenantContext };

/**
 * Resolves the caller's tenant, failing closed when it is missing.
 *
 * PLATFORM_OWNER / STUDIO_OPERATOR intentionally have no tenantId of their own —
 * they operate on tenants through the /api/studio/* routes, which do their own
 * explicit tenant selection. They must not fall through to a tenant-scoped route
 * with `tenantId: undefined`, because Prisma treats an undefined filter as "no
 * filter" and would return every tenant's rows.
 */
export function requireTenant(allowedRoles?: SessionUser["role"][]): GuardResult {
  let user: SessionUser | null;

  if (allowedRoles) {
    const auth = requireRole(allowedRoles);
    if (auth.error) return { error: auth.error, ctx: null };
    user = auth.user;
  } else {
    user = getSessionUser();
  }

  if (!user) {
    return { error: fail("Oturum bulunamadi", "UNAUTHORIZED", 401), ctx: null };
  }

  const tenantId = user.tenantId;
  if (!tenantId) {
    return {
      error: fail("Bu islem tenant kapsaminda calisir, kullanicinin tenant atamasi yok", "FORBIDDEN", 403),
      ctx: null,
    };
  }

  return { error: null, ctx: { user, tenantId } };
}

/**
 * Narrows a client-supplied object down to an explicit allowlist of fields.
 *
 * Prisma's `data: body` pattern is a mass-assignment hole: a caller can smuggle
 * `tenantId` (moving a record into another tenant) or overwrite computed money
 * columns. Routes should build their update payload through this instead.
 */
export function pickFields<K extends string>(
  source: unknown,
  allowed: readonly K[],
): { [P in K]?: any } {
  if (!source || typeof source !== "object") return {};
  const input = source as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      out[key] = input[key];
    }
  }
  return out as { [P in K]?: any };
}

/** Fields no client is ever allowed to set directly, on any model. */
export const NEVER_CLIENT_WRITABLE = ["id", "tenantId", "createdAt", "updatedAt"] as const;

/**
 * Guards the find-then-write pattern: returns a 404 (not 403) when the record
 * exists but belongs to another tenant, so the endpoint does not leak whether a
 * given id is in use elsewhere on the platform.
 */
export function notFound(message = "Kayit bulunamadi") {
  return fail(message, "NOT_FOUND", 404);
}
