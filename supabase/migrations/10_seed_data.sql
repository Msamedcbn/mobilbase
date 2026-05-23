-- 10_seed_data.sql: Default System Administration Seed Configuration
INSERT INTO "AppUser" ("id", "fullName", "email", "role", "passwordHash", "isActive", "createdAt", "updatedAt")
VALUES (
  'user-admin-seed',
  'Sistem Yoneticisi',
  'admin@telefoncupro.local',
  'ADMIN',
  '$2b$10$MBPYrQNaaQ82HEh0vQYCQ.LZViy9m1eyICKnKu2Qj7afukvtVDqQe',
  true,
  NOW(),
  NOW()
) ON CONFLICT ("email") DO NOTHING;


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
