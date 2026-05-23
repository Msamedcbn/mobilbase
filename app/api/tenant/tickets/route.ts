import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

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

// Helper to get or create tenant Customer record
async function getOrCreateTenantCustomer(tenantName: string) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    let customer = store.customers.find((c) => c.fullName === tenantName);
    if (!customer) {
      customer = {
        id: localId("cust"),
        nationalId: null,
        fullName: tenantName,
        phone: "5550000000",
        email: "destek@telefoncupro.local",
        notes: JSON.stringify(DEFAULT_TENANT_METADATA),
        creditLimit: 0,
      };
      store.customers.push(customer);
      await writeLocalStore(store);
    }
    return customer;
  } else {
    let customer = await prisma.customer.findFirst({
      where: { fullName: tenantName }
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: tenantName,
          phone: "5550000000",
          email: "destek@telefoncupro.local",
          notes: JSON.stringify(DEFAULT_TENANT_METADATA),
          creditLimit: 0,
        }
      });
    }
    return customer;
  }
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
    const tenantName = process.env.TENANT_NAME ?? "TelefoncuPro";
    const customer = await getOrCreateTenantCustomer(tenantName);
    const metadata = parseMetadata(customer.notes);
    return NextResponse.json({ tickets: metadata.tickets || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Biletler çekilemedi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenantName = process.env.TENANT_NAME ?? "TelefoncuPro";
    const body = await req.json();
    const { title, category, message } = body;

    if (!title || !category || !message) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    const customer = await getOrCreateTenantCustomer(tenantName);
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
    const tenantName = process.env.TENANT_NAME ?? "TelefoncuPro";
    const body = await req.json();
    const { ticketId, message } = body;

    if (!ticketId || !message) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    const customer = await getOrCreateTenantCustomer(tenantName);
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
