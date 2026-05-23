import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { nationalId: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((x) => x.nationalId === params.nationalId) ?? null;
    if (!customer) return ok({ found: false, customer: null });
    return ok({ found: true, customer });
  }

  const customer = await prisma.customer.findUnique({ where: { nationalId: params.nationalId } });
  if (!customer) return ok({ found: false, customer: null });
  return ok({ found: true, customer });
}
