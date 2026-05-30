import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { DEFAULT_CRM_FIELDS, normalizeCrmTask } from "@/lib/studio-crm";

function parseMeta(notes: string | null) {
  if (!notes) return { isSaaS: false } as any;
  try {
    const parsed = JSON.parse(notes);
    if (!parsed?.isSaaS) return { isSaaS: false } as any;
    return {
      ...DEFAULT_CRM_FIELDS,
      ...parsed,
      crmTasks: (parsed.crmTasks || []).map((x: any) => normalizeCrmTask(x)),
    };
  } catch {
    return { isSaaS: false } as any;
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const tenantId = String(body?.tenantId || "").trim();
  if (!tenantId) return NextResponse.json({ error: "tenantId zorunlu" }, { status: 400 });

  const taskId = params.id;

  const patchTask = (meta: any) => {
    const list = (meta.crmTasks || []).map((t: any) => {
      if (t.id !== taskId) return t;
      return normalizeCrmTask({ ...t, ...body, updatedAt: new Date().toISOString() });
    });
    return { ...meta, crmTasks: list, isSaaS: true };
  };

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx < 0) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
    const meta = parseMeta(store.customers[idx].notes);
    store.customers[idx].notes = JSON.stringify(patchTask(meta));
    await writeLocalStore(store);
    return NextResponse.json({ success: true });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId } });
  if (!customer) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
  const meta = parseMeta(customer.notes);
  await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify(patchTask(meta)) } });
  return NextResponse.json({ success: true });
}
