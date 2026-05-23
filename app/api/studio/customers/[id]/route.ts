import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

// SaaS Metadata Defaults & Helper
const DEFAULT_SAAS_METADATA = {
  isSaaS: true,
  plan: "Pro",
  licenseStart: "2026-01-01",
  licenseEnd: "2027-01-01",
  branchLimit: 5,
  databaseSizeGb: 0.5,
  smsQuota: 5000,
  smsUsed: 1200,
  leadStatus: "WON", // "LEAD" | "NEGOTIATION" | "OFFER_SENT" | "WON" | "LOST"
  leadHistory: [
    { date: "2026-05-18", note: "İlk tanışma telefonu gerçekleştirildi. Sistem tanıtımı yapıldı.", author: "SuperAdmin" },
    { date: "2026-05-19", note: "Pro teklif gönderildi. Şube ihtiyaçları değerlendirildi.", author: "SuperAdmin" }
  ],
  modules: {
    pos: true,
    repairs: true,
    stock: true,
    buyback: false,
    invoicing: false,
  },
  rolePermissions: {
    PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback"],
    MANAGER: ["pos", "repairs", "stock", "invoicing"],
    CASHIER: ["pos"],
    TECHNICIAN: ["repairs"],
    ACCOUNTANT: ["invoicing"],
  },
  tickets: [
    { 
      id: "t1", 
      title: "E-Arşiv Fatura entegrasyonu talebi", 
      category: "FEATURE", 
      status: "OPEN", 
      assignee: "Boşta",
      createdAt: "2026-05-20",
      messages: [
        { sender: "Tenant", body: "E-Arşiv fatura entegrasyonu ne zaman aktif olur?", date: "2026-05-20" },
        { sender: "Admin", body: "Entegrasyon test aşamasında, bu ay sonu yayına almayı hedefliyoruz.", date: "2026-05-20" }
      ]
    }
  ],
  billingLedger: [
    { id: "b1", type: "CHARGE", category: "LICENSE", amount: 2500, description: "Yıllık Pro Lisans Ücreti", date: "2026-01-01" },
    { id: "b2", type: "COLLECTION", category: "LICENSE", amount: 2500, description: "Havale/EFT ile Lisans Ödemesi", date: "2026-01-02" }
  ]
};

function parseSaasMetadata(notesStr: string | null) {
  if (!notesStr) return { ...DEFAULT_SAAS_METADATA };
  try {
    const parsed = JSON.parse(notesStr);
    if (parsed && typeof parsed === "object" && parsed.isSaaS) {
      return {
        ...DEFAULT_SAAS_METADATA,
        ...parsed,
        modules: {
          ...DEFAULT_SAAS_METADATA.modules,
          ...(parsed.modules || {})
        },
        leadHistory: parsed.leadHistory || [
          { date: parsed.licenseStart || "2026-01-01", note: "Sistem aktivasyonu yapıldı.", author: "SuperAdmin" }
        ],
        tickets: (parsed.tickets || []).map((t: any) => ({
          id: t.id || "t-" + Date.now(),
          title: t.title || "Destek Talebi",
          category: t.category || "OTHER",
          status: t.status || "OPEN",
          assignee: t.assignee || "Boşta",
          createdAt: t.createdAt || new Date().toISOString().split("T")[0],
          messages: t.messages || []
        })),
        billingLedger: (parsed.billingLedger || []).map((b: any) => ({
          id: b.id || "b-" + Date.now(),
          type: b.type || "CHARGE",
          category: b.category || "LICENSE",
          amount: Number(b.amount) || 0,
          description: b.description || "",
          date: b.date || new Date().toISOString().split("T")[0]
        }))
      };
    }
  } catch {
    // fallback if notes is a regular text string
  }
  return {
    ...DEFAULT_SAAS_METADATA,
    notesFallbackText: notesStr
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  const customerId = params.id;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const customer = store.customers.find((c) => c.id === customerId);
    if (!customer) {
      return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    const customerDevices = store.devices.filter((d) => d.customerId === customerId);
    const accountEntries = (store.accountEntries || [])
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const buybacks = store.buybacks
      .filter((b) => b.customerId === customerId)
      .map((b) => {
        const dev = customerDevices.find((d) => d.id === b.deviceId);
        return {
          ...b,
          device: dev ? { brand: dev.brand, model: dev.model } : null,
        };
      });
    const posSales = (store.transactions || [])
      .filter((t) => t.customerId === customerId && t.note?.includes("POS"))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const deviceIds = customerDevices.map((d) => d.id);
    const repairs = (store.repairs || [])
      .filter((r) => deviceIds.includes(r.deviceId))
      .map((r) => {
        const dev = customerDevices.find((d) => d.id === r.deviceId);
        return {
          ...r,
          device: dev ? { brand: dev.brand, model: dev.model } : null,
        };
      })
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return NextResponse.json({
      customer,
      saasMetadata: parseSaasMetadata(customer.notes),
      devices: customerDevices,
      accountEntries,
      buybacks,
      posSales,
      repairs,
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
    }

    const devices = await prisma.device.findMany({
      where: { customerId },
    });

    const accountEntries = await prisma.accountEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    const buybacks = await prisma.buybackDeal.findMany({
      where: { customerId },
      include: {
        device: {
          select: { brand: true, model: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const posSales = await prisma.posSale.findMany({
      where: { customerId },
      orderBy: { soldAt: "desc" },
    });

    const deviceIds = devices.map((d) => d.id);
    const repairs = await prisma.repairRecord.findMany({
      where: { deviceId: { in: deviceIds } },
      include: {
        device: {
          select: { brand: true, model: true },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json({
      customer,
      saasMetadata: parseSaasMetadata(customer.notes),
      devices,
      accountEntries,
      buybacks,
      posSales,
      repairs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bir hata oluştu" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  const customerId = params.id;
  try {
    const body = await req.json();
    const { saasMetadata } = body;
    if (!saasMetadata) {
      return NextResponse.json({ error: "SaaS metadata eksik" }, { status: 400 });
    }

    const notesJsonStr = JSON.stringify({
      ...saasMetadata,
      isSaaS: true
    });

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const idx = store.customers.findIndex((c) => c.id === customerId);
      if (idx === -1) {
        return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
      }
      store.customers[idx].notes = notesJsonStr;
      
      // Let's also update the name/email/phone if passed in the body
      if (body.fullName) store.customers[idx].fullName = body.fullName;
      if (body.email) store.customers[idx].email = body.email;
      if (body.phone) store.customers[idx].phone = body.phone;
      
      await writeLocalStore(store);
      return NextResponse.json({ success: true, notes: notesJsonStr, customer: store.customers[idx] });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { 
        notes: notesJsonStr,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone
      }
    });

    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Güncelleme sırasında hata oluştu" }, { status: 500 });
  }
}
