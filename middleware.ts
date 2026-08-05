import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionTokenEdge } from "@/lib/session-edge";
import { getCachedTenantStatus, setCachedTenantStatus } from "@/lib/tenant-status-cache";

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/studio/login",
  "/trial-expired",
  "/yardim",
  "/takas-hesapla",
  "/kayit",
  "/karsilastir",
  "/en-iyi-telefoncu-yazilimlari-2026",
  "/blog",
  "/story-preview",
  // Next.js metadata image conventions — social/crawler bots (WhatsApp, Twitter,
  // Google) fetch these unauthenticated. Without this they'd get redirected to
  // /login instead of the image, breaking every link-preview and rich result.
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/trial",
  "/api/health",
  "/api/health/liveness",
  "/api/health/readiness",
  "/api/internal/tenant-status",
  "/_next",
  "/favicon.ico",
  "/servis",
  "/neden-vibegsm",
  "/sehirler",
];

/**
 * Verifies the session cookie's HMAC before returning its claims.
 *
 * This used to be a bare base64 decode, so role/tenantId/module claims were
 * attacker-controlled and every check below was decorative.
 */
async function readVerifiedSession(token: string) {
  return (await verifySessionTokenEdge(token)) as any;
}

function getModuleFromPath(path: string): "pos" | "repairs" | "stock" | "invoicing" | "buyback" | null {
  const cleanPath = path.toLowerCase();

  if (cleanPath.startsWith("/pos") || cleanPath.startsWith("/api/pos")) {
    return "pos";
  }
  if (cleanPath.startsWith("/buyback") || cleanPath.startsWith("/api/buyback")) {
    return "buyback";
  }
  if (
    cleanPath.startsWith("/tamir-takip") ||
    cleanPath.startsWith("/parca-fiyatlari") ||
    cleanPath.startsWith("/servis") ||
    cleanPath.startsWith("/api/repairs") ||
    cleanPath.startsWith("/api/devices") ||
    cleanPath.startsWith("/api/device-models")
  ) {
    return "repairs";
  }
  if (
    cleanPath.startsWith("/stok") ||
    cleanPath.startsWith("/seri-no-takip") ||
    cleanPath.startsWith("/distributor-ithalat") ||
    cleanPath.startsWith("/api/products") ||
    cleanPath.startsWith("/api/stock-items") ||
    cleanPath.startsWith("/api/distributors") ||
    cleanPath.startsWith("/api/trade-in")
  ) {
    return "stock";
  }
  if (
    cleanPath.startsWith("/musteriler-veresiye") ||
    cleanPath.startsWith("/banka") ||
    cleanPath.startsWith("/taksit-yonetimi") ||
    cleanPath.startsWith("/giderler") ||
    cleanPath.startsWith("/vadeli-alis-borclari") ||
    cleanPath.startsWith("/api/invoices") ||
    cleanPath.startsWith("/api/banks") ||
    cleanPath.startsWith("/api/expenses") ||
    cleanPath.startsWith("/api/installments") ||
    cleanPath.startsWith("/api/account-entries") ||
    cleanPath.startsWith("/api/supplier-debts")
  ) {
    return "invoicing";
  }
  
  return null;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-request-path", path); // Set x-request-path header for API downstream checks


  // Public repair-tracking lookup: the route handler itself verifies the HMAC
  // token (`?t=`) and returns 401/404 on a bad/missing one — middleware just
  // avoids blocking the anonymous request before it gets there. Only GET is
  // let through; PUT/DELETE on the same path still require a real session.
  const isPublicRepairTrackingRequest =
    req.method === "GET" && path.startsWith("/api/repairs/") && req.nextUrl.searchParams.has("t");

  if (path === "/" || isPublicRepairTrackingRequest || PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const isStudioPath = path.startsWith("/studio") || path.startsWith("/api/studio");

  const rejectUnauthenticated = () => {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Oturum bulunamadi veya gecersiz" },
        { status: 401, headers: { "x-request-id": requestId } },
      );
    }
    const url = new URL(isStudioPath ? "/studio/login" : "/login", req.url);
    const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
    response.cookies.delete("tp_session");
    response.headers.set("x-request-id", requestId);
    return response;
  };

  const session = req.cookies.get("tp_session")?.value;
  if (!session) return rejectUnauthenticated();

  // Fail closed: an unverifiable cookie is treated exactly like no cookie, so a
  // forged payload cannot reach the checks below.
  const user = await readVerifiedSession(session);
  if (!user) return rejectUnauthenticated();

  // Trial expiry check — redirect expired trials to /trial-expired
  {
    if (user?.isTrial && user?.trialExpiresAt) {
      const expiresAt = new Date(user.trialExpiresAt).getTime();
      if (Date.now() > expiresAt) {
        if (path === "/trial-expired") {
          const response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("x-request-id", requestId);
          return response;
        }
        const url = new URL("/trial-expired", req.url);
        const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
        response.headers.set("x-request-id", requestId);
        return response;
      }
    }
  }

  // Reseller Studio Authorization check
  if (isStudioPath) {
    if (user.role !== "PLATFORM_OWNER" && user.role !== "STUDIO_OPERATOR") {
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Bu islem icin yetkiniz yok" },
          { status: 403, headers: { "x-request-id": requestId } }
        );
      }
      const url = new URL("/studio/login", req.url);
      const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
      return response;
    }
  }

  // Normal App Module Authorization checks
  try {
    if (user.userId) {
      try {
        const statusKey = `${user.userId}:${user.role !== "PLATFORM_OWNER" ? user.tenantId ?? "" : ""}`;
        let statusPayload = getCachedTenantStatus(statusKey);

        if (!statusPayload) {
          const statusParams = new URLSearchParams({ userId: user.userId });
          if (user.tenantId && user.role !== "PLATFORM_OWNER") statusParams.set("tenantId", user.tenantId);
          const statusRes = await fetch(`${req.nextUrl.origin}/api/internal/tenant-status?${statusParams.toString()}`, {
            headers: {
              "x-internal-token": process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "",
            },
            cache: "no-store",
          });
          if (statusRes.ok) {
            const fresh = await statusRes.json();
            statusPayload = {
              frozen: fresh?.frozen === true,
              userActive: fresh?.userActive !== false,
              sessionEpoch: Number(fresh?.sessionEpoch ?? 0),
            };
            setCachedTenantStatus(statusKey, statusPayload);
          }
        }

        if (statusPayload) {
          // Session revocation: a password change or an explicit "sign out
          // everywhere" bumps the user's epoch, which orphans every cookie
          // minted before it. Tokens issued before this field existed carry no
          // epoch and read as 0, matching the column default.
          if (Number(user.sessionEpoch ?? 0) !== statusPayload.sessionEpoch) {
            if (path.startsWith("/api/")) {
              return NextResponse.json(
                { error: "Oturumunuz sonlandirilmis. Lutfen tekrar giris yapin." },
                { status: 401, headers: { "x-request-id": requestId } }
              );
            }
            const url = new URL("/login", req.url);
            const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
            response.cookies.delete("tp_session");
            return response;
          }

          if (statusPayload.frozen === true) {
            if (path.startsWith("/api/")) {
              return NextResponse.json(
                { error: "Bu tenant dondurulmustur. Erisim gecici olarak kapatilmistir." },
                { status: 403, headers: { "x-request-id": requestId } }
              );
            }
            const url = new URL("/login", req.url);
            const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
            response.cookies.delete("tp_session");
            return response;
          }
          // Deactivated/deleted users lose access immediately instead of riding out
          // the remaining lifetime of an already-issued session cookie.
          if (statusPayload?.userActive === false) {
            if (path.startsWith("/api/")) {
              return NextResponse.json(
                { error: "Hesabiniz devre disi birakilmis." },
                { status: 403, headers: { "x-request-id": requestId } }
              );
            }
            const url = new URL("/login", req.url);
            const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
            response.cookies.delete("tp_session");
            return response;
          }
        }
      } catch {
        // Deliberate fail-open: a transient error reaching the internal status
        // route would otherwise lock every tenant out at once. The cost is that
        // the freeze and session-revocation checks are availability-biased —
        // they are enforcement for the normal path, not a hard security
        // boundary. The authoritative checks live in the API routes, which
        // re-verify the session on every call.
      }
    }

    if (user && user.role !== "ADMIN" && user.role !== "PLATFORM_OWNER" && user.role !== "MANAGER") {      // Check strict admin-only routes
      const isStrictAdminPath = path.startsWith("/api/admin");
      const isManagerAllowedAdminPath =
        user.role === "MANAGER" &&
        (path.startsWith("/api/admin/users") ||
          path.startsWith("/api/admin/system/config") ||
          path.startsWith("/api/admin/system/pdf-settings"));
      if (isStrictAdminPath) {
        if (isManagerAllowedAdminPath) {
          const response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set("x-request-id", requestId);
          return response;
        }
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Yonetimsel islemler icin yetkiniz bulunmamaktadir." },
            { status: 403, headers: { "x-request-id": requestId } }
          );
        }
        const url = new URL("/unauthorized", req.url);
        const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
        return response;
      }

      // Check branch management routes with role permissions
      const isBranchPath =
        path.startsWith("/subeler") ||
        path.startsWith("/personel-yonetimi") ||
        path.startsWith("/api/branches");
      if (isBranchPath) {
        const rolePermissions = user.rolePermissions || {};
        const activeModules = user.activeModules || {};
        const perms = rolePermissions[user.role] || [];
        const hasBranchPermission = perms.includes("branches") || perms.includes("stock");
        const isBranchModuleActive = activeModules.branches !== false && activeModules.stock !== false;

        if (!hasBranchPermission || !isBranchModuleActive) {
          if (path.startsWith("/api/")) {
            return NextResponse.json(
              { error: "Sube yonetimi icin yetkiniz bulunmamaktadir." },
              { status: 403, headers: { "x-request-id": requestId } }
            );
          }
          const url = new URL("/unauthorized", req.url);
          const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
          return response;
        }
      }

      // Check module restrictions
      const module = getModuleFromPath(path);
      if (module) {
        const activeModules = user.activeModules || {};
        const rolePermissions = user.rolePermissions || {};

        const isModuleActive = activeModules[module] !== false;
        const hasRolePermission = (rolePermissions[user.role] || []).includes(module);

        if (!isModuleActive || !hasRolePermission) {
          if (path.startsWith("/api/")) {
            return NextResponse.json(
              { error: `Bu modüle (${module}) erişim yetkiniz bulunmamaktadır.` },
              { status: 403, headers: { "x-request-id": requestId } }
            );
          }
          const url = new URL("/unauthorized", req.url);
          const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
          return response;
        }
      }
    }
  } catch (err) {
    // Fail closed. This block only runs authorization checks, so swallowing an
    // error here previously granted access on any unexpected fault.
    console.error("Normal app middleware authorization error:", err);
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Yetki dogrulamasi yapilamadi" },
        { status: 503, headers: { "x-request-id": requestId } }
      );
    }
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};

