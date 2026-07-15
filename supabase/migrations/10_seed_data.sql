-- 10_seed_data.sql: Default System Administration Seed Configuration

-- 1. Tenant (SaaS firma) Customer kaydı - TENANT_NAME env değişkeni ile eşleşmeli
--    ON CONFLICT DO NOTHING: kayıt zaten varsa (farklı id ile) atla, subquery halleder
INSERT INTO "Customer" ("id", "fullName", "phone", "email", "notes", "creditLimit", "createdAt", "updatedAt")
VALUES (
  'cust-tenant-seed',
  'VibeGSM',
  '5550000001',
  'admin@vibegsm.local',
  '{"isSaaS":true,"plan":"Pro","branchLimit":5,"databaseSizeGb":1.0,"smsQuota":5000,"smsUsed":0,"leadStatus":"WON","modules":{"pos":true,"repairs":true,"stock":true,"buyback":false,"invoicing":true},"rolePermissions":{"PLATFORM_OWNER":["pos","repairs","stock","invoicing","buyback"],"ADMIN":["pos","repairs","stock","invoicing","buyback"],"MANAGER":["pos","repairs","stock","invoicing"],"CASHIER":["pos"],"TECHNICIAN":["repairs"],"ACCOUNTANT":["invoicing"]},"tickets":[],"billingLedger":[]}',
  0.00,
  NOW(),
  NOW()
) ON CONFLICT ("phone") DO NOTHING;

-- 2. Sistem yöneticisi AppUser kaydı
--    tenantId'yi hardcoded string yerine subquery ile alıyoruz;
--    bu sayede Customer'ın gerçek id'si ne olursa olsun FK hatası oluşmaz.
INSERT INTO "AppUser" ("id", "fullName", "email", "role", "passwordHash", "isActive", "tenantId", "createdAt", "updatedAt")
SELECT
  'user-admin-seed',
  'Sistem Yoneticisi',
  'admin@vibegsm.local',
  'ADMIN',
  '$2b$10$MBPYrQNaaQ82HEh0vQYCQ.LZViy9m1eyICKnKu2Qj7afukvtVDqQe',
  true,
  c."id",
  NOW(),
  NOW()
FROM "Customer" c
WHERE c."fullName" = 'VibeGSM'
LIMIT 1
ON CONFLICT ("email") DO UPDATE SET "tenantId" = EXCLUDED."tenantId";

-- 3. Demo müşteri kaydı
INSERT INTO "Customer" ("id", "fullName", "phone", "nationalId", "creditLimit", "createdAt", "updatedAt")
VALUES (
  'cust-demo-seed',
  'Demo Musteri',
  '5550000000',
  '11111111111',
  0.00,
  NOW(),
  NOW()
) ON CONFLICT ("phone") DO NOTHING;
