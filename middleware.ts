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
  "/_next",
  "/favicon.ico",
  "/servis",
];

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

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-request-path", path); // Set x-request-path header for API downstream checks

  const isBuybackPage =
    path.startsWith("/buyback") ||
    path.startsWith("/ikinci-el");
  const isBuybackApi =
    path.startsWith("/api/buyback") ||
    path.startsWith("/api/buybacks") ||
    path.startsWith("/api/buyback-wizard");

  if (isBuybackApi) {
    return NextResponse.json(
      { error: "Buyback modulu bu SaaS urununden kaldirildi." },
      { status: 410, headers: { "x-request-id": requestId } },
    );
  }

  if (isBuybackPage) {
    const url = new URL("/", req.url);
    const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
    response.headers.set("x-request-id", requestId);
    return response;
  }

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
      const decodedSession = decodeURIComponent(session);
      const user = JSON.parse(decodedSession);
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
    const decodedSession = decodeURIComponent(session);
    const user = JSON.parse(decodedSession);

    if (user && user.role !== "ADMIN" && user.role !== "PLATFORM_OWNER") {
      // Check branch management or admin-only routes
      const isBranchAdminPath = path.startsWith("/subeler") || path.startsWith("/api/branches") || path.startsWith("/api/admin");
      if (isBranchAdminPath) {
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Şube yönetimi ve yönetimsel işlemler için yetkiniz bulunmamaktadır." },
            { status: 403, headers: { "x-request-id": requestId } }
          );
        }
        const url = new URL("/unauthorized", req.url);
        const response = NextResponse.redirect(url, { headers: { "x-request-id": requestId } });
        return response;
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
