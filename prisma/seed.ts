import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const defaultAdminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

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
