import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { requireRole, getSessionUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const user = getSessionUser();
  const tenantId = user?.tenantId || null;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const hasMockSeed = store.customers.some((c) => c.id === "mock-tenant-1");
    if (!hasMockSeed) {
      const mockTenants = [
        {
          id: "mock-tenant-1",
          nationalId: null,
          fullName: "TeknoMarket Zinciri A.Å.",
          phone: "08502220185",
          email: "kurumsal@teknomarket.com",
          creditLimit: 100000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Enterprise",
            licenseStart: "2026-01-01",
            licenseEnd: "2027-01-01",
            branchLimit: 250,
            databaseSizeGb: 4.8,
            smsQuota: 50000,
            smsUsed: 12400,
            leadStatus: "WON",
            leadHistory: [
              { date: "2026-01-01", note: "Enterprise paket satÄ±ÅŸÄ± tamamlandÄ±. 250 ÅŸube iÃ§in altyapÄ± hazÄ±rlandÄ±.", author: "SuperAdmin" },
              { date: "2026-03-15", note: "50,000 SMS ek paketi satÄ±n alÄ±ndÄ±.", author: "SuperAdmin" },
              { date: "2026-04-10", note: "Ã–zel ERP entegrasyonu talep edildi, Ã§alÄ±ÅŸma baÅŸlatÄ±ldÄ±.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: true },
            tickets: [
              {
                id: "t1",
                title: "API Entegrasyonunda HÄ±z Sorunu",
                category: "BUG",
                status: "OPEN",
                assignee: "Ahmet Sevim (SÃ¼perAdmin)",
                createdAt: "2026-05-20",
                messages: [
                  { sender: "Tenant", body: "AnlÄ±k satÄ±ÅŸ entegrasyonunda gecikmeler yaÅŸÄ±yoruz. Loglarda timeout gÃ¶zÃ¼kÃ¼yor.", date: "2026-05-20" },
                  { sender: "Admin", body: "Sorun inceleniyor. API gateway Ã¼zerindeki rate-limit deÄŸerini arttÄ±rÄ±yoruz.", date: "2026-05-21" },
                  { sender: "Tenant", body: "TeÅŸekkÃ¼rler, gecikme sÃ¼resi dÃ¼ÅŸtÃ¼ fakat hala ara ara tekrarlÄ±yor.", date: "2026-05-22" }
                ]
              },
              {
                id: "t2",
                title: "YÄ±llÄ±k Lisans SÃ¶zleÅŸmesi Ä°ndirimi",
                category: "BILLING",
                status: "RESOLVED",
                assignee: "Ahmet Sevim (SÃ¼perAdmin)",
                createdAt: "2026-05-02",
                messages: [
                  { sender: "Tenant", body: "Toplu ÅŸube lisans yenilemesi iÃ§in Ã¶zel bir iskonto alabilir miyiz?", date: "2026-05-02" },
                  { sender: "Admin", body: "YÄ±llÄ±k peÅŸin Ã¶demede %15 ek indirim tanÄ±mlanmÄ±ÅŸtÄ±r.", date: "2026-05-03" }
                ]
              }
            ],
            billingLedger: [
              { id: "b1", type: "CHARGE", category: "LICENSE", amount: 42000, description: "Enterprise YÄ±llÄ±k Paket Ãœcreti (250 Åube LisansÄ±)", date: "2026-01-01" },
              { id: "b2", type: "COLLECTION", category: "LICENSE", amount: 42000, description: "Havale/EFT ile Tahsilat", date: "2026-01-02" },
              { id: "b3", type: "CHARGE", category: "SMS_PACK", amount: 3500, description: "50,000 SMS Paketi Eklemesi", date: "2026-03-15" },
              { id: "b4", type: "COLLECTION", category: "SMS_PACK", amount: 3500, description: "Kredi KartÄ± ile Tahsilat", date: "2026-03-15" },
              { id: "b5", type: "CHARGE", category: "CUSTOM_DEV", amount: 15000, description: "Ã–zel ERP Entegrasyon ModÃ¼lÃ¼ GeliÅŸtirme", date: "2026-04-10" },
              { id: "b6", type: "CHARGE", category: "SUPPORT", amount: 5000, description: "7/24 Gold Destek Paketi YÄ±llÄ±k Bedel", date: "2026-05-01" },
              { id: "b7", type: "COLLECTION", category: "SUPPORT", amount: 5000, description: "Havale/EFT ile Tahsilat", date: "2026-05-02" }
            ]
          })
        },
        {
          id: "mock-tenant-2",
          nationalId: null,
          fullName: "Apex Ä°letiÅŸim Grubu",
          phone: "08503330112",
          email: "info@apexiletisim.com.tr",
          creditLimit: 50000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Enterprise",
            licenseStart: "2026-02-01",
            licenseEnd: "2027-02-01",
            branchLimit: 150,
            databaseSizeGb: 2.9,
            smsQuota: 30000,
            smsUsed: 9800,
            leadStatus: "WON",
            leadHistory: [
              { date: "2026-02-01", note: "Enterprise paket satÄ±ÅŸÄ± tamamlandÄ±. 150 ÅŸube lisansÄ± tanÄ±mlandÄ±.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: false, stock: true, buyback: false, invoicing: true },
            tickets: [
              {
                id: "t3",
                title: "Yeni ÅŸube ekleme limiti artÄ±rÄ±mÄ±",
                category: "FEATURE",
                status: "IN_PROGRESS",
                assignee: "Zeynep YÄ±lmaz (Destek)",
                createdAt: "2026-05-21",
                messages: [
                  { sender: "Tenant", body: "LisansÄ±mÄ±zda 150 ÅŸube tanÄ±mlÄ±. Bunu 180'e yÃ¼kseltmek istiyoruz.", date: "2026-05-21" },
                  { sender: "Admin", body: "Talebiniz alÄ±nmÄ±ÅŸtÄ±r. Ek ÅŸube bedelleri ve fatura detaylarÄ± iÃ§in satÄ±ÅŸ temsilcimiz iletiÅŸime geÃ§ecektir.", date: "2026-05-22" }
                ]
              }
            ],
            billingLedger: [
              { id: "b8", type: "CHARGE", category: "LICENSE", amount: 28000, description: "Enterprise YÄ±llÄ±k Paket Ãœcreti (150 Åube LisansÄ±)", date: "2026-02-01" },
              { id: "b9", type: "COLLECTION", category: "LICENSE", amount: 20000, description: "Havale/EFT ile KÄ±smi Tahsilat", date: "2026-02-02" }
            ]
          })
        },
        {
          id: "mock-tenant-3",
          nationalId: null,
          fullName: "GenÃ§lik GSM Franchising",
          phone: "08504440095",
          email: "bayi@genclikgsm.com",
          creditLimit: 30000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Enterprise",
            licenseStart: "2026-03-01",
            licenseEnd: "2027-03-01",
            branchLimit: 100,
            databaseSizeGb: 1.8,
            smsQuota: 20000,
            smsUsed: 14500,
            leadStatus: "WON",
            leadHistory: [
              { date: "2026-03-01", note: "100 bayili franchise yapÄ±sÄ± iÃ§in geÃ§iÅŸ tamamlandÄ±.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: false },
            tickets: [
              {
                id: "t4",
                title: "E-ArÅŸiv Fatura Seri NumarasÄ± HatasÄ±",
                category: "BUG",
                status: "OPEN",
                assignee: "BoÅŸta",
                createdAt: "2026-05-22",
                messages: [
                  { sender: "Tenant", body: "Fatura keserken seriler birbirini takip etmiyor, mÃ¼kerrer hatasÄ± alÄ±yoruz.", date: "2026-05-22" }
                ]
              }
            ],
            billingLedger: [
              { id: "b10", type: "CHARGE", category: "LICENSE", amount: 18000, description: "Enterprise YÄ±llÄ±k Paket Ãœcreti (100 Åube LisansÄ±)", date: "2026-03-01" },
              { id: "b11", type: "COLLECTION", category: "LICENSE", amount: 18000, description: "Havale/EFT ile Tahsilat", date: "2026-03-01" }
            ]
          })
        },
        {
          id: "mock-tenant-4",
          nationalId: null,
          fullName: "Mega Cep DÃ¼nyasÄ±",
          phone: "05329990054",
          email: "mega@cepdunyasi.com",
          creditLimit: 20000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Pro",
            licenseStart: "2026-04-01",
            licenseEnd: "2027-04-01",
            branchLimit: 54,
            databaseSizeGb: 0.8,
            smsQuota: 10000,
            smsUsed: 5200,
            leadStatus: "WON",
            leadHistory: [
              { date: "2026-04-01", note: "Pro paket satÄ±ÅŸÄ± tamamlandÄ±. 54 ÅŸube tanÄ±mlandÄ±.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: [
              { id: "b12", type: "CHARGE", category: "LICENSE", amount: 12000, description: "Pro YÄ±llÄ±k Paket Ãœcreti (54 Åube LisansÄ±)", date: "2026-04-01" },
              { id: "b13", type: "COLLECTION", category: "LICENSE", amount: 12000, description: "Havale/EFT ile Tahsilat", date: "2026-04-01" }
            ]
          })
        },
        {
          id: "mock-tenant-5",
          nationalId: null,
          fullName: "Alo Mobil Åubeleri",
          phone: "05428880035",
          email: "iletisim@alomobil.net",
          creditLimit: 10000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Pro",
            licenseStart: "2026-05-10",
            licenseEnd: "2027-05-10",
            branchLimit: 35,
            databaseSizeGb: 0.6,
            smsQuota: 5000,
            smsUsed: 2200,
            leadStatus: "NEGOTIATION",
            leadHistory: [
              { date: "2026-05-10", note: "Ä°lk tanÄ±tÄ±m toplantÄ±sÄ± yapÄ±ldÄ±. Bayi memnun kaldÄ±. Teklif bekleniyor.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: false, stock: true, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: []
          })
        },
        {
          id: "mock-tenant-6",
          nationalId: null,
          fullName: "HÄ±zlÄ± Teknik Servis",
          phone: "05557770018",
          email: "servis@hizliservis.com",
          creditLimit: 5000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Lite",
            licenseStart: "2026-05-15",
            licenseEnd: "2027-05-15",
            branchLimit: 18,
            databaseSizeGb: 0.2,
            smsQuota: 2000,
            smsUsed: 800,
            leadStatus: "OFFER_SENT",
            leadHistory: [
              { date: "2026-05-15", note: "Teknik servis odaklÄ± paket teklifi sunuldu.", author: "SuperAdmin" }
            ],
            modules: { pos: false, repairs: true, stock: false, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: []
          })
        },
        {
          id: "mock-tenant-7",
          nationalId: null,
          fullName: "Mavi Cep NoktasÄ±",
          phone: "05051110013",
          email: "mavicep@gmail.com",
          creditLimit: 5000,
          notes: JSON.stringify({
            isSaaS: true,
            plan: "Lite",
            licenseStart: "2026-05-20",
            licenseEnd: "2026-06-20",
            branchLimit: 13,
            databaseSizeGb: 0.1,
            smsQuota: 1000,
            smsUsed: 20,
            leadStatus: "LEAD",
            leadHistory: [
              { date: "2026-05-20", note: "MÃ¼ÅŸteri adayÄ± olarak eklendi. Test sÃ¼resi baÅŸlatÄ±ldÄ±.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: false, stock: false, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: []
          })
        }
      ];
      store.customers.push(...mockTenants);
      await writeLocalStore(store);
    }
    return ok(store.customers.filter((c) => c.tenantId === tenantId));
  }

  try {
    const items = await prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { notes: null },
          { NOT: { notes: { contains: "\"isSaaS\":true" } } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
    return ok(items);
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Customer validation failure details:", parsed.error.format(), "Body was:", body);
      return fail("Geçersiz müşteri verisi", "VALIDATION", 400);
    }

    const tenantId = auth.user?.tenantId || null;
    const payload = {
      ...parsed.data,
      nationalId: parsed.data.nationalId || null,
      email: parsed.data.email || null,
      tenantId,
    };
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const existing = payload.nationalId ? store.customers.find((c) => c.nationalId === payload.nationalId && c.tenantId === tenantId) : null;
      if (existing) {
        existing.fullName = payload.fullName;
        existing.phone = payload.phone;
        existing.email = payload.email;
        existing.notes = payload.notes ?? null;
        await writeLocalStore(store);
        return ok(existing, 201, "Müşteri kaydi basarili");
      }
      const created = {
        id: localId("cust"),
        nationalId: payload.nationalId,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes ?? null,
        tenantId,
      };
      store.customers.unshift(created);
      await writeLocalStore(store);
      return ok(created, 201, "Müşteri kaydi basarili");
    }

    const item = payload.nationalId
      ? await prisma.customer.upsert({
          where: {
            nationalId_tenantId: {
              nationalId: payload.nationalId,
              tenantId: tenantId || "",
            },
          },
          update: {
            fullName: payload.fullName,
            phone: payload.phone,
            email: payload.email,
            notes: payload.notes,
          },
          create: payload,
        })
      : await prisma.customer.create({ data: payload });

    await writeAuditLog({
      action: "CUSTOMER_UPSERT",
      entityType: "Customer",
      entityId: item.id,
      actorUserId: auth.user?.userId,
      customerId: item.id,
    });

    return ok(item, 201, "Müşteri kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

