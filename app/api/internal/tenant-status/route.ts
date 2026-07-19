import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { isTenantFrozenFromNotes } from "@/lib/tenant-metadata";

function isAuthorizedInternalRequest(req: Request) {
  const provided = req.headers.get("x-internal-token") || "";
  const expected = process.env.INTERNAL_API_TOKEN || process.env.SESSION_SECRET || "";
  return Boolean(expected) && provided === expected;
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
    return NextResponse.json({ frozen, userActive });
  }

  const [tenant, appUser] = await Promise.all([
    tenantId ? prisma.customer.findUnique({ where: { id: tenantId }, select: { notes: true } }) : null,
    userId ? prisma.appUser.findUnique({ where: { id: userId }, select: { isActive: true } }) : null,
  ]);

  return NextResponse.json({
    frozen: tenantId ? isTenantFrozenFromNotes(tenant?.notes) : false,
    userActive: userId ? (appUser ? appUser.isActive !== false : false) : true,
  });
}
