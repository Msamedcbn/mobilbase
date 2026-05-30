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
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId zorunludur." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const tenant = store.customers.find((c) => c.id === tenantId);
    return NextResponse.json({ frozen: isTenantFrozenFromNotes(tenant?.notes) });
  }

  const tenant = await prisma.customer.findUnique({
    where: { id: tenantId },
    select: { notes: true },
  });
  return NextResponse.json({ frozen: isTenantFrozenFromNotes(tenant?.notes) });
}
