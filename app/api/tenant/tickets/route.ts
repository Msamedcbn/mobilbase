import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireTenant } from "@/lib/tenant-guard";

// SaaS Metadata Defaults & Helper for Tenant Support bot
const DEFAULT_TENANT_METADATA = {
  isSaaS: true,
  plan: "Pro",
  licenseStart: new Date().toISOString().split("T")[0],
  licenseEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +1 year
  branchLimit: 5,
  databaseSizeGb: 1.0,
  smsQuota: 5000,
  smsUsed: 0,
  leadStatus: "WON",
  leadHistory: [
    { date: new Date().toISOString().split("T")[0], note: "Sistem aktivasyonu yapıldı.", author: "SuperAdmin" }
  ],
  modules: {
    pos: true,
    repairs: true,
    stock: true,
    buyback: false, // buyback disabled by default
    invoicing: false,
  },
  rolePermissions: {
    PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback"],
    MANAGER: ["pos", "repairs", "stock", "invoicing"],
    CASHIER: ["pos"],
    TECHNICIAN: ["repairs"],
    ACCOUNTANT: ["invoicing"],
  },
  tickets: [],
  billingLedger: []
};

// Resolves the caller's own tenant Customer record by id. Every real tenant
// already has a Customer row created at signup, so this never auto-creates —
// a miss here means the session's tenantId is stale/invalid, which is a hard
// failure, not a "make one up" situation.
async function getTenantCustomerById(tenantId: string) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    return store.customers.find((c) => c.id === tenantId) ?? null;
  }
  return prisma.customer.findUnique({ where: { id: tenantId } });
}

async function saveTenantCustomerNotes(customerId: string, notesStr: string) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.customers.findIndex((c) => c.id === customerId);
    if (idx !== -1) {
      store.customers[idx].notes = notesStr;
      await writeLocalStore(store);
    }
  } else {
    await prisma.customer.update({
      where: { id: customerId },
      data: { notes: notesStr }
    });
  }
}

function parseMetadata(notes: string | null) {
  if (!notes) return { ...DEFAULT_TENANT_METADATA };
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === "object" && parsed.isSaaS) {
      return {
        ...DEFAULT_TENANT_METADATA,
        ...parsed,
        modules: {
          ...DEFAULT_TENANT_METADATA.modules,
          ...(parsed.modules || {})
        },
        tickets: parsed.tickets || []
      };
    }
  } catch {}
  return { ...DEFAULT_TENANT_METADATA };
}

export async function GET() {
  try {
    const guard = requireTenant();
    if (guard.error) return guard.error;

    const customer = await getTenantCustomerById(guard.ctx.tenantId);
    if (!customer) return NextResponse.json({ error: "Tenant bulunamadi" }, { status: 404 });

    const metadata = parseMetadata(customer.notes);
    return NextResponse.json({ tickets: metadata.tickets || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Biletler çekilemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guard = requireTenant();
    if (guard.error) return guard.error;

    const body = await req.json();
    const { title, category, message } = body;

    if (!title || !category || !message) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    const customer = await getTenantCustomerById(guard.ctx.tenantId);
    if (!customer) return NextResponse.json({ error: "Tenant bulunamadi" }, { status: 404 });

    const metadata = parseMetadata(customer.notes);

    const newTicket = {
      id: "t-" + Date.now(),
      title,
      category: category.toUpperCase(),
      status: "OPEN",
      assignee: "Boşta",
      createdAt: new Date().toISOString().split("T")[0],
      messages: [
        { sender: "Tenant", body: message, date: new Date().toISOString().split("T")[0] }
      ]
    };

    metadata.tickets = [newTicket, ...(metadata.tickets || [])];
    await saveTenantCustomerNotes(customer.id, JSON.stringify(metadata));

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Destek talebi oluşturulamadı" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const guard = requireTenant();
    if (guard.error) return guard.error;

    const body = await req.json();
    const { ticketId, message } = body;

    if (!ticketId || !message) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    const customer = await getTenantCustomerById(guard.ctx.tenantId);
    if (!customer) return NextResponse.json({ error: "Tenant bulunamadi" }, { status: 404 });

    const metadata = parseMetadata(customer.notes);

    let updatedTicket = null;
    metadata.tickets = (metadata.tickets || []).map((t: any) => {
      if (t.id === ticketId) {
        updatedTicket = {
          ...t,
          status: "OPEN", // Reopen ticket if replica is received
          messages: [
            ...(t.messages || []),
            { sender: "Tenant", body: message, date: new Date().toISOString().split("T")[0] }
          ]
        };
        return updatedTicket;
      }
      return t;
    });

    if (!updatedTicket) {
      return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    }

    await saveTenantCustomerNotes(customer.id, JSON.stringify(metadata));

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Cevap eklenemedi" }, { status: 500 });
  }
}
