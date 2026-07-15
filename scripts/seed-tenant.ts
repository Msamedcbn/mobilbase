// scripts/seed-tenant.ts - Prisma ile tenant seed
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_NAME = process.env.TENANT_NAME ?? 'VibeGSM';
const ADMIN_EMAIL = process.env.DEMO_LOGIN_EMAIL ?? 'admin@vibegsm.local';

const TENANT_META = {
  isSaaS: true,
  plan: 'Pro',
  branchLimit: 5,
  databaseSizeGb: 1.0,
  smsQuota: 5000,
  smsUsed: 0,
  leadStatus: 'WON',
  modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: true },
  rolePermissions: {
    PLATFORM_OWNER: ['pos', 'repairs', 'stock', 'invoicing', 'buyback'],
    ADMIN: ['pos', 'repairs', 'stock', 'invoicing', 'buyback'],
    MANAGER: ['pos', 'repairs', 'stock', 'invoicing'],
    CASHIER: ['pos'],
    TECHNICIAN: ['repairs'],
    ACCOUNTANT: ['invoicing'],
  },
  tickets: [],
  billingLedger: [],
};

async function main() {
  console.log(`[seed-tenant] Tenant: "${TENANT_NAME}", Admin: "${ADMIN_EMAIL}"`);

  // 1. Tenant Customer kontrolü / oluşturma
  let tenant = await prisma.customer.findFirst({
    where: { fullName: TENANT_NAME },
    select: { id: true, fullName: true, email: true },
  });

  if (tenant) {
    console.log(`✅ Tenant zaten mevcut: id=${tenant.id}`);
  } else {
    tenant = await prisma.customer.create({
      data: {
        fullName: TENANT_NAME,
        phone: '5550000001',
        email: ADMIN_EMAIL,
        notes: JSON.stringify(TENANT_META),
        creditLimit: 0,
      },
      select: { id: true, fullName: true, email: true },
    });
    console.log(`✅ Tenant oluşturuldu: id=${tenant.id}`);
  }

  // 2. Admin kullanıcısını tenant ile eşleştir
  const adminUser = await prisma.appUser.findUnique({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    select: { id: true, email: true, tenantId: true },
  });

  if (!adminUser) {
    console.log('⚠️  Admin kullanıcı henüz DB\'de yok - ilk girişte oluşturulacak.');
  } else if (adminUser.tenantId === tenant.id) {
    console.log(`✅ Admin kullanıcı zaten tenant ile eşleşmiş.`);
  } else {
    await (prisma.appUser as any).update({
      where: { id: adminUser.id },
      data: { tenantId: tenant.id },
    });
    console.log(`✅ Admin (${ADMIN_EMAIL}) → tenantId=${tenant.id} güncellendi.`);
  }

  console.log('🎉 Tenant seed tamamlandı!');
}

main()
  .catch((err) => {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
