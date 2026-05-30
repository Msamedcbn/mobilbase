import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { DEFAULT_CRM_FIELDS, inferSuggestions, normalizeCrmTask } from "@/lib/studio-crm";

function parseMeta(notes: string | null) {
  if (!notes) return { isSaaS: false } as any;
  try {
    const parsed = JSON.parse(notes);
    if (!parsed?.isSaaS) return { isSaaS: false } as any;
    return {
      ...DEFAULT_CRM_FIELDS,
      ...parsed,
      leadHistory: Array.isArray(parsed.leadHistory) ? parsed.leadHistory : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      crmTasks: (parsed.crmTasks || []).map((x: any) => normalizeCrmTask(x)),
    };
  } catch {
    return { isSaaS: false } as any;
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER", "MANAGER"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const tenantId = String(body?.tenantId || "").trim();
  const suggestionType = String(body?.suggestionType || "").trim();
  if (!tenantId || !suggestionType) {
    return NextResponse.json({ error: "tenantId ve suggestionType zorunlu" }, { status: 400 });
  }

  const applyToMeta = (meta: any, fullName: string) => {
    const suggestions = inferSuggestions({
      tenantId,
      tenantName: fullName,
      leadStatus: meta.leadStatus || "LEAD",
      leadHistory: meta.leadHistory || [],
      nextActionDate: meta.nextActionDate,
      expectedDealAmount: Number(meta.expectedDealAmount || 0),
      planPrice: meta.plan === "Enterprise" ? 3500 : meta.plan === "Pro" ? 1500 : meta.plan === "Service" ? 990 : 750,
      openTicketCount: (meta.tickets || []).filter((t: any) => t.status !== "RESOLVED").length,
      ownerUserId: meta.ownerUserId || "",
    });
    const suggestion = suggestions.find((s) => s.type === suggestionType);
    if (!suggestion) {
      return { error: "Uygulanabilir oneri bulunamadi" };
    }

    const newTask = normalizeCrmTask({
      ...suggestion.suggestedTask,
      id: `crm-task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "SUGGESTION",
    });

    const note = {
      date: new Date().toISOString().split("T")[0],
      note: `Oneriden gorev olusturuldu: ${suggestion.title}`,
      author: "StudioCRM",
    };

    return {
      meta: {
        ...meta,
        crmTasks: [newTask, ...(meta.crmTasks || [])],
        leadHistory: [note, ...(meta.leadHistory || [])],
        isSaaS: true,
      },
      task: newTask,
    };
  };

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === tenantId);
    if (idx < 0) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
    const meta = parseMeta(store.customers[idx].notes);
    const result = applyToMeta(meta, store.customers[idx].fullName);
    if ((result as any).error) return NextResponse.json({ error: (result as any).error }, { status: 400 });
    store.customers[idx].notes = JSON.stringify((result as any).meta);
    await writeLocalStore(store);
    return NextResponse.json({ success: true, task: (result as any).task });
  }

  const customer = await prisma.customer.findUnique({ where: { id: tenantId } });
  if (!customer) return NextResponse.json({ error: "tenant bulunamadi" }, { status: 404 });
  const meta = parseMeta(customer.notes);
  const result = applyToMeta(meta, customer.fullName);
  if ((result as any).error) return NextResponse.json({ error: (result as any).error }, { status: 400 });

  await prisma.customer.update({
    where: { id: tenantId },
    data: { notes: JSON.stringify((result as any).meta) },
  });

  return NextResponse.json({ success: true, task: (result as any).task });
}
