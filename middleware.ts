import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/unauthorized",
  "/studio/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/health/liveness",
  "/api/health/readiness",
  "/api/internal/tenant-status",
  "/_next",
  "/favicon.ico",
  "/servis",
];

function decodeSessionPayloadFromToken(token: string) {
  try {
    const [encodedBody] = token.split(".");
    if (!encodedBody) return null;
    const normalized = encodedBody.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as any;
  } catch {
    return null;
  }
}

function getModuleFromPath(path: string): "pos" | "repairs" | "stock" | "invoicing" | null {
  const cleanPath = path.toLowerCase();
  
  if (cleanPath.startsWith("/pos") || cleanPath.startsWith("/api/pos")) {
    return "pos";
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
    cleanPath.startsWith("/api/invoices") ||
    cleanPath.startsWith("/api/banks") ||
    cleanPath.startsWith("/api/expenses") ||
    cleanPath.startsWith("/api/installments") ||
    cleanPath.startsWith("/api/account-entries")
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


  if (path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const session = req.cookies.get("tp_session")?.value;
  if (!session) {
    const isStudioPath = path.startsWith("/studio") || path.startsWith("/api/studio");
    const redirectPath = isStudioPath ? "/studio/login" : "/login";
    const url = new URL(redirectPath, req.url);
    const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  // Reseller Studio Authorization check
  if (path.startsWith("/studio") || path.startsWith("/api/studio")) {
    try {
      const user = decodeSessionPayloadFromToken(session);
      if (!user) throw new Error("Invalid session token");
      if (user.role !== "ADMIN" && user.role !== "PLATFORM_OWNER") {
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
    } catch (err) {
      console.error("Studio middleware auth parse error:", err);
      const url = new URL("/studio/login", req.url);
      const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
      return response;
    }
  }

  // Normal App Module Authorization checks
  try {
    const user = decodeSessionPayloadFromToken(session);
    if (!user) throw new Error("Invalid session token");

    if (user.tenantId && user.role !== "PLATFORM_OWNER") {
      try {
        const statusRes = await fetch(`${req.nextUrl.origin}/api/internal/tenant-status?tenantId=${encodeURIComponent(user.tenantId)}`, {
          headers: {
            "x-internal-token": process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "",
          },
          cache: "no-store",
        });
        if (statusRes.ok) {
          const statusPayload = await statusRes.json();
          if (statusPayload?.frozen === true) {
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
        }
      } catch {
        // fail-open to avoid accidental global lockout on transient internal route errors
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
      const isBranchPath = path.startsWith("/subeler") || path.startsWith("/api/branches");
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
    console.error("Normal app middleware auth parse error:", err);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};

