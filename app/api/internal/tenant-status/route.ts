import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { isTenantFrozenFromNotes } from "@/lib/tenant-metadata";

let warnedAboutMissingToken = false;

function isAuthorizedInternalRequest(req: Request) {
  const provided = req.headers.get("x-internal-token") || "";
  const expected = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";

  if (!expected) {
    // With neither variable set this route rejects every caller, including
    // middleware — which fails open, so the tenant-freeze, user-deactivation and
    // session-revocation checks all silently stop being enforced. Say so loudly
    // rather than letting the platform look like it is protecting itself.
    if (!warnedAboutMissingToken) {
      warnedAboutMissingToken = true;
      console.error(
        "[tenant-status] INTERNAL_API_TOKEN and SESSION_SECRET are both unset — " +
          "tenant freeze, user deactivation and session revocation are NOT being enforced.",
      );
    }
    return false;
  }

  return provided === expected;
}

export async function GET(req: Request) {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const userId = searchParams.get("userId");
  if (!tenantId && !userId) {
    return NextResponse.json({ error: "tenantId veya userId zorunludur." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const frozen = tenantId
      ? isTenantFrozenFromNotes(store.customers.find((c) => c.id === tenantId)?.notes)
      : false;
    const localUser = userId ? (store.users || []).find((u) => u.id === userId) : undefined;
    const userActive = userId ? (localUser ? localUser.isActive !== false : false) : true;
    return NextResponse.json({ frozen, userActive, sessionEpoch: 0 });
  }

  const [tenant, appUser] = await Promise.all([
    tenantId ? prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } }) : null,
    userId
      ? prisma.appUser.findUnique({ where: { id: userId }, select: { isActive: true, sessionEpoch: true } })
      : null,
  ]);

  return NextResponse.json({
    frozen: tenantId ? isTenantFrozenFromNotes(tenant?.notes) : false,
    userActive: userId ? (appUser ? appUser.isActive !== false : false) : true,
    // Middleware compares this against the epoch baked into the session cookie
    // so revoked sessions stop working before their natural expiry.
    sessionEpoch: appUser?.sessionEpoch ?? 0,
  });
}
