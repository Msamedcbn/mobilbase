import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { nationalId: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId || null;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((x) => x.nationalId === params.nationalId && x.tenantId === tenantId) ?? null;
    if (!customer) return ok({ found: false, customer: null });
    return ok({ found: true, customer });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      nationalId_tenantId: {
        nationalId: params.nationalId,
        tenantId: tenantId || "",
      },
    },
  });
  if (!customer) return ok({ found: false, customer: null });
  return ok({ found: true, customer });
}
