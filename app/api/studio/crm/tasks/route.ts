import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { DEFAULT_CRM_FIELDS, normalizeCrmTask, type CrmTask } from "@/lib/studio-crm";

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

export async function GET(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER", "STUDIO_OPERATOR"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") || "";

  const customers = isDbDisabledMode()
    ? (await readLocalStore()).customers
    : await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });

  const rows: Array<CrmTask & { tenantId: string; tenantName: string }> = [];
  for (const c of customers as any[]) {
    const meta = parseMeta(c.notes);
    if (!meta.isSaaS) continue;
    for (const t of meta.crmTasks as CrmTask[]) {
      rows.push({ ...t, tenantId: c.id, tenantName: c.fullName });
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const filtered = owner ? rows.filter((r) => r.ownerUserId === owner) : rows;
  const overdue = filtered.filter((t) => t.status !== "DONE" && t.dueDate < todayStr);
  const today = filtered.filter((t) => t.status !== "DONE" && t.dueDate === todayStr);

  return NextResponse.json({
    asOf: new Date().toISOString(),
    total: filtered.length,
    today,
    overdue,
    tasks: filtered.sort((a, b) => `${a.dueDate}`.localeCompare(`${b.dueDate}`)),
  });
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const tenantId = String(body?.tenantId || "").trim();
  if (!tenantId) return NextResponse.json({ error: "tenantId zorunlu" }, { status: 400 });

  const task = normalizeCrmTask({
    id: `crm-task-${Date.now()}`,
    ...body,
    status: body?.status || "OPEN",
    source: body?.source || "MANUAL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx < 0) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
    const meta = parseMeta(store.customers[idx].notes);
    meta.crmTasks = [...(meta.crmTasks || []), task];
    meta.isSaaS = true;
    store.customers[idx].notes = JSON.stringify(meta);
    await writeLocalStore(store);
    return NextResponse.json({ success: true, task });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId } });
  if (!customer) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
  const meta = parseMeta(customer.notes);
  meta.crmTasks = [...(meta.crmTasks || []), task];
  const updated = await prisma.customer.update({ where: { id: tenantId }, data: { notes: JSON.stringify({ ...meta, isSaaS: true }) } });
  return NextResponse.json({ success: true, task, customer: { id: updated.id } });
}
