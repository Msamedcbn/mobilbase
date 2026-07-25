import { prisma } from "@/lib/prisma";
import { buybackDealUpdateSchema } from "@/lib/validations";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fail, ok } from "@/lib/api-response";
import { isBuybackOpsEnabled, requireFeature } from "@/lib/feature-flags";
import { isValidBuybackStatusTransition } from "@/lib/buyback-policy";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

function buildBuybackStockName(device: { brand?: string | null; model?: string | null; storage?: string | null; color?: string | null; imei?: string | null }) {
  return [device.brand, device.model, device.storage, device.color].filter(Boolean).join(" ").trim() || "Buyback Cihaz";
}

function buildBuybackSku(dealId: string, imei?: string | null) {
  const tail = dealId.slice(-8).toUpperCase();
  return imei ? `BUYBACK-${tail}-${imei}` : `BUYBACK-${tail}`;
}

function mapDocuments(item: any, customer: any, device: any) {
  const docs: Array<{ kind: "PDF" | "IMAGE" | "IDENTITY"; name: string; fileType: string; url: string | null }> = [
    { kind: "PDF", name: "Sozlesme", fileType: "pdf", url: `/api/buyback/documents/${item.id}/template/1` },
    { kind: "PDF", name: "Ozet", fileType: "pdf", url: `/api/buyback/documents/${item.id}/template/2` },
    { kind: "PDF", name: "Alim Satim Belgesi", fileType: "pdf", url: `/api/buyback/documents/${item.id}/template/3` },
  ];
  const notes = String(customer?.notes ?? "");
  const marker = "Gorseller:";
  const idx = notes.indexOf(marker);
  if (idx >= 0) {
    const raw = notes.slice(idx + marker.length).trim();
    if (raw && raw !== "-") {
      raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((entry) => {
        const [slot, ...rest] = entry.split(":");
        docs.push({ kind: "IMAGE", name: `Cihaz ${slot}`, fileType: "jpg/png", url: rest.join(":") || null });
      });
    }
  }
  return docs;
}

function mapQa(device: any) {
  const note = String(device?.conditionNote ?? "");
  if (!note) return [];
  return note.split("|").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const [q, ...rest] = entry.split(":");
    return {
      soru: q || "Degerlendirme",
      musteriYaniti: rest.join(":") || "-",
      vendorDegerlendirmesi: rest.join(":") || "-",
    };
  });
}

function mapTimeline(item: any) {
  return [
    { eventType: "BUYBACK_CREATED", actor: "SYSTEM", at: item.createdAt ?? new Date().toISOString() },
    { eventType: "STATUS_UPDATED", actor: "OPERATOR", at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(), status: item.status },
  ];
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;
  const pinBranch = req.headers.get("x-branch-id");
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = store.buybacks.find((b) => b.id === params.id);
    if (!item) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    const customer = store.customers.find((c) => c.id === item.customerId && c.tenantId === auth.user.tenantId) ?? null;
    if (!customer) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    const device = store.devices.find((d) => d.id === item.deviceId) ?? null;
    const payload = {
      ...item,
      branchId: (item as any).branchId ?? null,
      customer,
      device,
      documents: mapDocuments(item, customer, device),
      qa: mapQa(device),
      timeline: mapTimeline(item),
    };
    if (pinBranch && payload.branchId && payload.branchId !== pinBranch) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    return ok(payload);
  }

  const item = await prisma.buybackDeal.findFirst({
    where: {
      id: params.id,
      customer: {
        tenantId: auth.user.tenantId,
      },
    },
    include: { customer: true, device: true },
  });
  if (!item) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
  const payload = {
    ...item,
    branchId: null,
    documents: mapDocuments(item, item.customer, item.device),
    qa: mapQa(item.device),
    timeline: mapTimeline(item),
  };
  if (pinBranch && payload.branchId && payload.branchId !== pinBranch) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
  return ok(payload);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN", "CASHIER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const parsed = buybackDealUpdateSchema.safeParse(body);
    if (!parsed.success) return fail("Gecersiz buyback guncelleme verisi", "VALIDATION", 400);

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const current = store.buybacks.find((b) => b.id === params.id);
      if (!current) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
      const customer = store.customers.find((c) => c.id === current.customerId && c.tenantId === auth.user.tenantId);
      if (!customer) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
      if (parsed.data.branchId) {
        const branch = (store.branches || []).find((b) => b.id === parsed.data.branchId && b.tenantId === auth.user.tenantId);
        if (!branch) return fail("Şube bulunamadı veya yetkisiz", "NOT_FOUND", 404);
      }

      const nextStatus = parsed.data.status ?? current.status;
      if (!isValidBuybackStatusTransition(current.status, nextStatus)) {
        return fail(`Durum gecisi gecersiz: ${current.status} -> ${nextStatus}`, "VALIDATION", 400);
      }
      if (nextStatus === "COMPLETED" && parsed.data.agreedPrice == null && current.agreedPrice == null) {
        return fail("COMPLETED icin agreedPrice zorunludur", "VALIDATION", 400);
      }

      const agreedPriceValue = parsed.data.agreedPrice !== undefined ? parsed.data.agreedPrice : current.agreedPrice;
      const targetBankAccountId = parsed.data.bankAccountId !== undefined ? parsed.data.bankAccountId : (current.bankAccountId || null);

      if (nextStatus === "COMPLETED" && current.status !== "COMPLETED" && targetBankAccountId && agreedPriceValue) {
        const bank = store.bankAccounts?.find((b) => b.id === targetBankAccountId);
        if (bank) {
          bank.balance = Number(bank.balance) - Number(agreedPriceValue);
        }
      }

      if (nextStatus === "COMPLETED" && current.status !== "COMPLETED") {
        const device = (store.devices || []).find((d) => d.id === current.deviceId);
        // Guard against phantom duplicate inventory: a StockItem for this exact deal
        // may already exist (re-triggered completion), or a StockItem carrying the
        // same physical IMEI may already exist and still be in stock (manual entry,
        // another buyback deal). Either case must skip creation, not add a duplicate.
        const existingStock = (store.stockItems || []).find(
          (s: any) =>
            s.tenantId === auth.user.tenantId &&
            (s.buybackDealId === current.id || (device?.imei && s.imei === device.imei && Number(s.quantity) > 0)),
        );
        if (!existingStock && device) {
          const now = new Date().toISOString();
          const stockItemId = `stock-item-${Math.random().toString(36).slice(2, 11)}`;
          const sku = buildBuybackSku(current.id, device.imei);
          const stockItem = {
            id: stockItemId,
            tenantId: auth.user.tenantId,
            sku,
            name: buildBuybackStockName(device),
            category: "Telefon",
            brand: device.brand || null,
            model: device.model || null,
            variantColor: device.color || null,
            variantStorage: device.storage || null,
            serialNumber: device.serialNumber || null,
            imei: device.imei || null,
            quantity: 1,
            purchasePrice: Number(agreedPriceValue || 0),
            salePrice: Number(current.offeredPrice || 0),
            purchaseDocType: "BUYBACK",
            purchaseDocNo: current.id,
            minThreshold: 0,
            isCatalog: false,
            condition: "Buyback",
            isBuybackItem: true,
            buybackProcessStatus: "SERVICE_TRANSFERRED",
            buybackSaleEnabled: false,
            buybackDealId: current.id,
            purchaseDate: now,
            createdAt: now,
            updatedAt: now,
          };
          if (!store.stockItems) store.stockItems = [];
          store.stockItems.push(stockItem as any);
          if (!store.productBranchStocks) store.productBranchStocks = [];
          const branchId = store.branches?.[0]?.id;
          if (branchId) {
            store.productBranchStocks.push({
              id: `pbs-${Math.random().toString(36).slice(2, 11)}`,
              productId: stockItemId,
              branchId,
              stock: 1,
            });
          }
        }
      }

      Object.assign(current, parsed.data);
      await writeLocalStore(store);
      return ok(current, 200, "Buyback kaydi guncellendi");
    }

    const current = await prisma.buybackDeal.findFirst({
      where: {
        id: params.id,
        customer: {
          tenantId: auth.user.tenantId,
        },
      },
    });
    if (!current) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    if (parsed.data.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: parsed.data.branchId, tenantId: auth.user.tenantId },
        select: { id: true },
      });
      if (!branch) return fail("Şube bulunamadı veya yetkisiz", "NOT_FOUND", 404);
    }

    const nextStatus = parsed.data.status ?? current.status;
    if (!isValidBuybackStatusTransition(current.status, nextStatus)) {
      return fail(`Durum gecisi gecersiz: ${current.status} -> ${nextStatus}`, "VALIDATION", 400);
    }

    if (nextStatus === "COMPLETED" && parsed.data.agreedPrice == null && current.agreedPrice == null) {
      return fail("COMPLETED icin agreedPrice zorunludur", "VALIDATION", 400);
    }

    const agreedPriceValue = parsed.data.agreedPrice !== undefined ? parsed.data.agreedPrice : current.agreedPrice;
    const targetBankAccountId = parsed.data.bankAccountId !== undefined ? parsed.data.bankAccountId : current.bankAccountId;

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.buybackDeal.update({
        where: { id: params.id },
        data: parsed.data,
      });

      if (nextStatus === "COMPLETED" && current.status !== "COMPLETED" && targetBankAccountId && agreedPriceValue) {
        await tx.bankAccount.update({
          where: { id: targetBankAccountId },
          data: { balance: { decrement: Number(agreedPriceValue) } },
        });
      }
      if (nextStatus === "COMPLETED" && current.status !== "COMPLETED") {
        const device = await tx.device.findUnique({ where: { id: current.deviceId } });

        // Guard against phantom duplicate inventory: a StockItem for this exact deal
        // may already exist (re-triggered completion), or a StockItem carrying the
        // same physical IMEI may already exist from another source (manual entry,
        // another buyback deal). Either case must skip creation, not add a duplicate.
        const existingStock = await tx.stockItem.findFirst({
          where: {
            tenantId: auth.user.tenantId,
            OR: [
              { buybackDealId: current.id },
              ...(device?.imei ? [{ imei: device.imei, quantity: { gte: 1 } }] : []),
            ],
          },
          select: { id: true },
        });

        if (!existingStock) {
          if (device) {
            const stockItem = await tx.stockItem.create({
              data: {
                tenantId: auth.user.tenantId,
                sku: buildBuybackSku(current.id, device.imei),
                name: buildBuybackStockName(device),
                category: "Telefon",
                brand: device.brand || null,
                model: device.model || null,
                variantColor: device.color || null,
                variantStorage: device.storage || null,
                serialNumber: device.serialNumber || null,
                imei: device.imei || null,
                quantity: 1,
                purchasePrice: Number(agreedPriceValue || 0),
                salePrice: Number(current.offeredPrice || 0),
                purchaseDocType: "BUYBACK",
                purchaseDocNo: current.id,
                minThreshold: 0,
                isCatalog: false,
                condition: "Buyback",
                isBuybackItem: true,
                buybackProcessStatus: "SERVICE_TRANSFERRED",
                buybackSaleEnabled: false,
                buybackDealId: current.id,
                purchaseDate: new Date(),
              },
            });

            const existingProduct = await tx.product.findFirst({
              where: { barcode: stockItem.sku, tenantId: auth.user.tenantId ?? null },
              select: { id: true },
            });
            const createdProduct = existingProduct
              ? await tx.product.update({
                  where: { id: existingProduct.id },
                  data: {
                    name: stockItem.name,
                    category: stockItem.category,
                    brand: stockItem.brand,
                    model: stockItem.model,
                    variantColor: stockItem.variantColor,
                    variantStorage: stockItem.variantStorage,
                    serialNumber: stockItem.serialNumber,
                    imei: stockItem.imei,
                    stock: stockItem.quantity,
                    purchasePrice: stockItem.purchasePrice,
                    salePrice: stockItem.salePrice,
                    purchaseDocType: stockItem.purchaseDocType,
                    purchaseDocNo: stockItem.purchaseDocNo,
                    isCatalog: false,
                    condition: stockItem.condition,
                    purchaseDate: stockItem.purchaseDate,
                  },
                })
              : await tx.product.create({
                  data: {
                    name: stockItem.name,
                    barcode: stockItem.sku,
                    category: stockItem.category,
                    brand: stockItem.brand,
                    model: stockItem.model,
                    variantColor: stockItem.variantColor,
                    variantStorage: stockItem.variantStorage,
                    serialNumber: stockItem.serialNumber,
                    imei: stockItem.imei,
                    stock: stockItem.quantity,
                    purchasePrice: stockItem.purchasePrice,
                    salePrice: stockItem.salePrice,
                    purchaseDocType: stockItem.purchaseDocType,
                    purchaseDocNo: stockItem.purchaseDocNo,
                    isCatalog: false,
                    condition: stockItem.condition,
                    purchaseDate: stockItem.purchaseDate,
                    tenantId: auth.user.tenantId,
                  },
                });

            const defaultBranch = await tx.branch.findFirst({
              where: { tenantId: auth.user.tenantId },
              orderBy: { createdAt: "asc" },
              select: { id: true },
            });
            if (defaultBranch) {
              await tx.productBranchStock.upsert({
                where: {
                  productId_branchId: {
                    productId: createdProduct.id,
                    branchId: defaultBranch.id,
                  },
                },
                create: {
                  productId: createdProduct.id,
                  branchId: defaultBranch.id,
                  stock: stockItem.quantity,
                },
                update: {
                  stock: stockItem.quantity,
                },
              });
            }
          }
        }
      }
      return updated;
    });

    await writeAuditLog({
      action: "BUYBACK_UPDATE",
      entityType: "BuybackDeal",
      entityId: item.id,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      customerId: item.customerId,
      detail: `Status:${current.status}->${item.status}`,
    });

    return ok(item, 200, "Buyback kaydi guncellendi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const disabled = requireFeature(isBuybackOpsEnabled(), "Buyback operasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const idx = store.buybacks.findIndex((b) => b.id === params.id);
    if (idx === -1) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    const customer = store.customers.find((c) => c.id === store.buybacks[idx].customerId && c.tenantId === auth.user.tenantId);
    if (!customer) return fail("Kayit bulunamadi", "NOT_FOUND", 404);
    store.buybacks.splice(idx, 1);
    await writeLocalStore(store);
    return ok({ success: true }, 200, "Buyback kaydi silindi");
  }

  try {
    const current = await prisma.buybackDeal.findFirst({
      where: {
        id: params.id,
        customer: {
          tenantId: auth.user.tenantId,
        },
      },
    });
    if (!current) return fail("Kayit bulunamadi", "NOT_FOUND", 404);

    await prisma.buybackDeal.delete({ where: { id: params.id } });
    await writeAuditLog({
      action: "BUYBACK_DELETE",
      entityType: "BuybackDeal",
      entityId: params.id,
      actorUserId: auth.user?.userId,
      tenantId: auth.user?.tenantId ?? null,
      customerId: current.customerId,
      detail: `Deleted status:${current.status}`,
    });

    return ok({ success: true }, 200, "Buyback kaydi silindi");
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), 400);
  }
}
