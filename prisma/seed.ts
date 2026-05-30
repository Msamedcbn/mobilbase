import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

  // 1. Seed tenant customer first to satisfy foreign key constraints
  await prisma.customer.upsert({
    where: { id: "cust-tenant-seed" },
    update: {},
    create: {
      id: "cust-tenant-seed",
      fullName: "TelefoncuPro",
      phone: "5550000001",
      email: "admin@telefoncupro.local",
      notes: JSON.stringify({
        isSaaS: true,
        plan: "Pro",
        branchLimit: 5,
        databaseSizeGb: 1.0,
        smsQuota: 5000,
        smsUsed: 0,
        leadStatus: "WON",
        modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: true },
        rolePermissions: {
          PLATFORM_OWNER: ["pos", "repairs", "stock", "invoicing", "buyback"],
          ADMIN: ["pos", "repairs", "stock", "invoicing", "buyback"],
          MANAGER: ["pos", "repairs", "stock", "invoicing"],
          CASHIER: ["pos"],
          TECHNICIAN: ["repairs"],
          ACCOUNTANT: ["invoicing"],
        },
        tickets: [],
        billingLedger: [],
      }),
      creditLimit: 0,
    },
  });

  // 2. Seed default branch for the tenant
  await prisma.branch.upsert({
    where: { name_tenantId: { name: "Merkez Şube", tenantId: "cust-tenant-seed" } },
    update: {},
    create: {
      name: "Merkez Şube",
      tenantId: "cust-tenant-seed",
    },
  });

  // 3. Seed default bank accounts for the tenant
  await prisma.bankAccount.upsert({
    where: { name_tenantId: { name: "Nakit Kasa", tenantId: "cust-tenant-seed" } },
    update: {},
    create: {
      name: "Nakit Kasa",
      balance: 0,
      tenantId: "cust-tenant-seed",
    },
  });

  await prisma.bankAccount.upsert({
    where: { name_tenantId: { name: "Bankkart Pos", tenantId: "cust-tenant-seed" } },
    update: {},
    create: {
      name: "Bankkart Pos",
      balance: 0,
      tenantId: "cust-tenant-seed",
    },
  });

  // 4. Seed admin user
  await prisma.appUser.upsert({
    where: { email: "admin@telefoncupro.local" },
    update: {
      fullName: "Sistem Yoneticisi",
      role: "ADMIN",
      isActive: true,
    },
    create: {
      fullName: "Sistem Yoneticisi",
      email: "admin@telefoncupro.local",
      role: "ADMIN",
      isActive: true,
      passwordHash: hashSync(defaultAdminPassword, 10),
      tenantId: "cust-tenant-seed",
    },
  });


  await prisma.customer.upsert({
    where: {
      phone_tenantId: {
        phone: "5550000000",
        tenantId: "cust-tenant-seed"
      }
    },
    update: {},
    create: {
      fullName: "Demo Musteri",
      phone: "5550000000",
      nationalId: "11111111111",
      tenantId: "cust-tenant-seed",
    },
  });

  await prisma.product.upsert({
    where: {
      barcode_tenantId: {
        barcode: "869000000001",
        tenantId: "cust-tenant-seed"
      }
    },
    update: { stock: 15, salePrice: 1299 },
    create: {
      name: "Type-C Hızlı Şarj Adaptörü",
      barcode: "869000000001",
      category: "Aksesuar",
      stock: 15,
      purchasePrice: 800,
      salePrice: 1299,
      tenantId: "cust-tenant-seed",
    },
  });

  await prisma.product.upsert({
    where: {
      barcode_tenantId: {
        barcode: "869000000002",
        tenantId: "cust-tenant-seed"
      }
    },
    update: { stock: 20, salePrice: 499 },
    create: {
      name: "Temperli Cam",
      barcode: "869000000002",
      category: "Aksesuar",
      stock: 20,
      purchasePrice: 150,
      salePrice: 499,
      tenantId: "cust-tenant-seed",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
