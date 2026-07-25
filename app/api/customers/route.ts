import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { requireRole, getSessionUser, getEffectiveTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  const user = getSessionUser();
  const tenantId = await getEffectiveTenantId(user);


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
              { date: "2026-01-01", note: "Enterprise paket satışı tamamlandı. 250 şube için altyapı hazırlandı.", author: "SuperAdmin" },
              { date: "2026-03-15", note: "50,000 SMS ek paketi satın alındı.", author: "SuperAdmin" },
              { date: "2026-04-10", note: "Özel ERP entegrasyonu talep edildi, çalışma başlatıldı.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: true },
            tickets: [
              {
                id: "t1",
                title: "API Entegrasyonunda Hız Sorunu",
                category: "BUG",
                status: "OPEN",
                assignee: "Ahmet Sevim (SüperAdmin)",
                createdAt: "2026-05-20",
                messages: [
                  { sender: "Tenant", body: "Anlık satış entegrasyonunda gecikmeler yaşıyoruz. Loglarda timeout gözüküyor.", date: "2026-05-20" },
                  { sender: "Admin", body: "Sorun inceleniyor. API gateway üzerindeki rate-limit değerini arttırıyoruz.", date: "2026-05-21" },
                  { sender: "Tenant", body: "Teşekkürler, gecikme süresi düştü fakat hala ara ara tekrarlıyor.", date: "2026-05-22" }
                ]
              },
              {
                id: "t2",
                title: "Yıllık Lisans Sözleşmesi İndirimi",
                category: "BILLING",
                status: "RESOLVED",
                assignee: "Ahmet Sevim (SüperAdmin)",
                createdAt: "2026-05-02",
                messages: [
                  { sender: "Tenant", body: "Toplu şube lisans yenilemesi için özel bir iskonto alabilir miyiz?", date: "2026-05-02" },
                  { sender: "Admin", body: "Yıllık peşin ödemede %15 ek indirim tanımlanmıştır.", date: "2026-05-03" }
                ]
              }
            ],
            billingLedger: [
              { id: "b1", type: "CHARGE", category: "LICENSE", amount: 42000, description: "Enterprise Yıllık Paket Ücreti (250 Åube Lisansı)", date: "2026-01-01" },
              { id: "b2", type: "COLLECTION", category: "LICENSE", amount: 42000, description: "Havale/EFT ile Tahsilat", date: "2026-01-02" },
              { id: "b3", type: "CHARGE", category: "SMS_PACK", amount: 3500, description: "50,000 SMS Paketi Eklemesi", date: "2026-03-15" },
              { id: "b4", type: "COLLECTION", category: "SMS_PACK", amount: 3500, description: "Kredi Kartı ile Tahsilat", date: "2026-03-15" },
              { id: "b5", type: "CHARGE", category: "CUSTOM_DEV", amount: 15000, description: "Özel ERP Entegrasyon Modülü Geliştirme", date: "2026-04-10" },
              { id: "b6", type: "CHARGE", category: "SUPPORT", amount: 5000, description: "7/24 Gold Destek Paketi Yıllık Bedel", date: "2026-05-01" },
              { id: "b7", type: "COLLECTION", category: "SUPPORT", amount: 5000, description: "Havale/EFT ile Tahsilat", date: "2026-05-02" }
            ]
          })
        },
        {
          id: "mock-tenant-2",
          nationalId: null,
          fullName: "Apex İletişim Grubu",
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
              { date: "2026-02-01", note: "Enterprise paket satışı tamamlandı. 150 şube lisansı tanımlandı.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: false, stock: true, buyback: false, invoicing: true },
            tickets: [
              {
                id: "t3",
                title: "Yeni şube ekleme limiti artırımı",
                category: "FEATURE",
                status: "IN_PROGRESS",
                assignee: "Zeynep Yılmaz (Destek)",
                createdAt: "2026-05-21",
                messages: [
                  { sender: "Tenant", body: "Lisansımızda 150 şube tanımlı. Bunu 180'e yükseltmek istiyoruz.", date: "2026-05-21" },
                  { sender: "Admin", body: "Talebiniz alınmıştır. Ek şube bedelleri ve fatura detayları için satış temsilcimiz iletişime geçecektir.", date: "2026-05-22" }
                ]
              }
            ],
            billingLedger: [
              { id: "b8", type: "CHARGE", category: "LICENSE", amount: 28000, description: "Enterprise Yıllık Paket Ücreti (150 Åube Lisansı)", date: "2026-02-01" },
              { id: "b9", type: "COLLECTION", category: "LICENSE", amount: 20000, description: "Havale/EFT ile Kısmi Tahsilat", date: "2026-02-02" }
            ]
          })
        },
        {
          id: "mock-tenant-3",
          nationalId: null,
          fullName: "Gençlik GSM Franchising",
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
              { date: "2026-03-01", note: "100 bayili franchise yapısı için geçiş tamamlandı.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: false },
            tickets: [
              {
                id: "t4",
                title: "E-Arşiv Fatura Seri Numarası Hatası",
                category: "BUG",
                status: "OPEN",
                assignee: "Boşta",
                createdAt: "2026-05-22",
                messages: [
                  { sender: "Tenant", body: "Fatura keserken seriler birbirini takip etmiyor, mükerrer hatası alıyoruz.", date: "2026-05-22" }
                ]
              }
            ],
            billingLedger: [
              { id: "b10", type: "CHARGE", category: "LICENSE", amount: 18000, description: "Enterprise Yıllık Paket Ücreti (100 Åube Lisansı)", date: "2026-03-01" },
              { id: "b11", type: "COLLECTION", category: "LICENSE", amount: 18000, description: "Havale/EFT ile Tahsilat", date: "2026-03-01" }
            ]
          })
        },
        {
          id: "mock-tenant-4",
          nationalId: null,
          fullName: "Mega Cep Dünyası",
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
              { date: "2026-04-01", note: "Pro paket satışı tamamlandı. 54 şube tanımlandı.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: [
              { id: "b12", type: "CHARGE", category: "LICENSE", amount: 12000, description: "Pro Yıllık Paket Ücreti (54 Åube Lisansı)", date: "2026-04-01" },
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
              { date: "2026-05-10", note: "İlk tanıtım toplantısı yapıldı. Bayi memnun kaldı. Teklif bekleniyor.", author: "SuperAdmin" }
            ],
            modules: { pos: true, repairs: false, stock: true, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: []
          })
        },
        {
          id: "mock-tenant-6",
          nationalId: null,
          fullName: "Hızlı Teknik Servis",
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
              { date: "2026-05-15", note: "Teknik servis odaklı paket teklifi sunuldu.", author: "SuperAdmin" }
            ],
            modules: { pos: false, repairs: true, stock: false, buyback: false, invoicing: false },
            tickets: [],
            billingLedger: []
          })
        },
        {
          id: "mock-tenant-7",
          nationalId: null,
          fullName: "Mavi Cep Noktası",
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
              { date: "2026-05-20", note: "Müşteri adayı olarak eklendi. Test süresi başlatıldı.", author: "SuperAdmin" }
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

    const requestedTenantId = typeof body?.tenantId === "string" ? body.tenantId : null;
    const effectiveTenantId = await getEffectiveTenantId(auth.user);
    const tenantId = requestedTenantId || effectiveTenantId || null;
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
      tenantId,
      customerId: item.id,
    });

    return ok(item, 201, "Müşteri kaydi basarili");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

