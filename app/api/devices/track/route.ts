import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

export async function GET(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN"]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() || "";

  if (!query) {
    return fail("Arama terimi zorunludur", "VALIDATION", 400);
  }

  try {
    const tenantId = auth.user.tenantId || null;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const q = query.toLowerCase();

      const device = store.devices.find(
        (d) =>
          ((d.imei && d.imei.toLowerCase() === q) ||
            (d.serialNumber && d.serialNumber.toLowerCase() === q)) &&
          store.customers.some((c) => c.id === d.customerId && c.tenantId === tenantId),
      );

      const stockMatches = (store.stockItems || []).filter(
        (s) => (s.imei && s.imei.toLowerCase() === q) || (s.serialNumber && s.serialNumber.toLowerCase() === q),
      );

      if (!device && stockMatches.length === 0) {
        return fail("Cihaz bulunamadi", "NOT_FOUND", 404);
      }

      const customer = device
        ? (store.customers.find((c) => c.id === device.customerId && c.tenantId === tenantId) ?? null)
        : null;

      const history: Array<any> = [];

      if (device) {
        history.push({
          id: `device-created-${device.id}`,
          type: "DEVICE_CREATED",
          date: (device as any).createdAt || new Date().toISOString(),
          title: "Cihaz Kaydi Olusturuldu",
          status: "OK",
          detail: `${device.brand} ${device.model} cihazi sisteme kaydedildi.`,
          note: "-",
        });

        history.push(
          ...(store.repairs || [])
            .filter((r) => r.deviceId === device.id)
            .map((r) => ({
              id: r.id,
              type: "REPAIR",
              date: r.receivedAt,
              title: "Tamir/Onarim Kaydi",
              status: r.status,
              detail: r.issueDescription,
              note: r.diagnosisNote || "-",
              costs: {
                laborCost: Number(r.laborCost || 0),
                partCost: Number(r.partCost || 0),
                totalCost: Number(r.totalCost || 0),
              },
              completedAt: r.completedAt || null,
            })),
        );

        history.push(
          ...(store.buybacks || [])
            .filter((b) => b.deviceId === device.id)
            .map((b) => ({
              id: b.id,
              type: "BUYBACK",
              date: b.createdAt || new Date().toISOString(),
              title: "Ikinci El Alim Kaydi",
              status: b.status,
              detail: `Teklif: ${Number(b.offeredPrice).toLocaleString("tr-TR")} TL / Anlasilan: ${Number(
                b.agreedPrice ?? b.offeredPrice,
              ).toLocaleString("tr-TR")} TL`,
              note: b.evaluationNote || "-",
            })),
        );
      }

      stockMatches.forEach((s) => {
        history.push({
          id: `stock-created-${s.id}`,
          type: "STOCK_PURCHASE",
          date: s.createdAt || new Date().toISOString(),
          title: "Envantere Giris",
          status: "IN_STOCK",
          detail: `${s.name} / SKU: ${s.sku} / Adet: ${s.quantity}`,
          note: s.purchaseDocNo ? `${s.purchaseDocType || "BELGE"} No: ${s.purchaseDocNo}` : "-",
        });
      });

      const relatedStockIds = new Set(stockMatches.map((s) => s.id));
      history.push(
        ...(store.stockLogs || [])
          .filter((l) => relatedStockIds.has(l.entityId))
          .map((l) => ({
            id: l.id,
            type: l.action === "STOCK_DELETE" ? "STOCK_OUT" : "STOCK_LOG",
            date: l.createdAt,
            title: l.action === "STOCK_DELETE" ? "Envanterden Cikis" : "Envanter Hareketi",
            status: l.action,
            detail: l.detail,
            note: "-",
          })),
      );

      history.push(
        ...(store.stockCostEvents || [])
          .filter((e) => relatedStockIds.has(e.stockItemId))
          .map((e) => ({
            id: e.id,
            type: "STOCK_LOG",
            date: e.createdAt,
            title: "Maliyet Hareketi",
            status: e.type,
            detail: `Tutar: ${Number(e.amount).toLocaleString("tr-TR")} TL / Delta: ${Number(e.costDelta).toLocaleString("tr-TR")} TL / Yeni Birim Maliyet: ${Number(e.unitCostAfter).toLocaleString("tr-TR")} TL`,
            note: `${e.referenceNo ? `Ref: ${e.referenceNo}` : "-"} ${e.note ? `| ${e.note}` : ""}`.trim(),
          })),
      );

      history.push(
        ...(store.transactions || [])
          .filter((t) => (t.note || "").toLowerCase().includes(q))
          .map((t) => ({
            id: t.id,
            type: "SALE",
            date: t.createdAt,
            title: t.type === "INCOME" ? "Satis Islemi" : "Gider Islemi",
            status: t.paymentMethod,
            detail: `${t.transactionNo} / ${Number(t.totalAmount).toLocaleString("tr-TR")} TL`,
            note: t.note || "-",
          })),
      );

      return ok({
        device: device || null,
        customer,
        stockItems: stockMatches,
        history: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      });
    }

    const q = query;
    const device = await prisma.device.findFirst({
      where: {
        OR: [{ imei: { equals: q, mode: "insensitive" } }, { serialNumber: { equals: q, mode: "insensitive" } }],
        customer: { tenantId },
      },
      include: {
        customer: true,
        repairRecords: { orderBy: { receivedAt: "desc" } },
        buybackDeals: { orderBy: { createdAt: "desc" } },
      },
    });

    const stockMatches = await prisma.stockItem.findMany({
      where: {
        tenantId,
        OR: [{ imei: { equals: q, mode: "insensitive" } }, { serialNumber: { equals: q, mode: "insensitive" } }],
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!device && stockMatches.length === 0) {
      return fail("Cihaz bulunamadi", "NOT_FOUND", 404);
    }

    const history: Array<any> = [];

    if (device) {
      history.push({
        id: `device-created-${device.id}`,
        type: "DEVICE_CREATED",
        date: device.createdAt.toISOString(),
        title: "Cihaz Kaydi Olusturuldu",
        status: "OK",
        detail: `${device.brand} ${device.model} cihazi sisteme kaydedildi.`,
        note: "-",
      });

      history.push(
        ...device.repairRecords.map((r) => ({
          id: r.id,
          type: "REPAIR",
          date: r.receivedAt.toISOString(),
          title: "Tamir/Onarim Kaydi",
          status: r.status,
          detail: r.issueDescription,
          note: r.diagnosisNote || "-",
          costs: {
            laborCost: Number(r.laborCost),
            partCost: Number(r.partCost),
            totalCost: Number(r.totalCost),
          },
          completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        })),
      );

      history.push(
        ...device.buybackDeals.map((b) => ({
          id: b.id,
          type: "BUYBACK",
          date: b.createdAt.toISOString(),
          title: "Ikinci El Alim Kaydi",
          status: b.status,
          detail: `Teklif: ${Number(b.offeredPrice).toLocaleString("tr-TR")} TL / Anlasilan: ${Number(
            b.agreedPrice ?? b.offeredPrice,
          ).toLocaleString("tr-TR")} TL`,
          note: b.evaluationNote || "-",
        })),
      );
    }

    stockMatches.forEach((s) => {
      history.push({
        id: `stock-created-${s.id}`,
        type: "STOCK_PURCHASE",
        date: s.createdAt.toISOString(),
        title: "Envantere Giris",
        status: "IN_STOCK",
        detail: `${s.name} / SKU: ${s.sku} / Adet: ${s.quantity}`,
        note: s.purchaseDocNo ? `${s.purchaseDocType || "BELGE"} No: ${s.purchaseDocNo}` : "-",
      });
    });

    const txMatches = await prisma.transaction.findMany({
      where: { tenantId, note: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    history.push(
      ...txMatches.map((t) => ({
        id: t.id,
        type: "SALE",
        date: t.createdAt.toISOString(),
        title: t.type === "INCOME" ? "Satis Islemi" : "Gider Islemi",
        status: t.paymentMethod,
        detail: `${t.transactionNo} / ${Number(t.totalAmount).toLocaleString("tr-TR")} TL`,
        note: t.note || "-",
      })),
    );

    if (stockMatches.length > 0) {
      const costEvents = await prisma.stockCostEvent.findMany({
        where: { stockItemId: { in: stockMatches.map((s) => s.id) } },
        orderBy: { createdAt: "desc" },
      });
      history.push(
        ...costEvents.map((e) => ({
          id: e.id,
          type: "STOCK_LOG",
          date: e.createdAt.toISOString(),
          title: "Maliyet Hareketi",
          status: e.type,
          detail: `Tutar: ${Number(e.amount).toLocaleString("tr-TR")} TL / Delta: ${Number(e.costDelta).toLocaleString("tr-TR")} TL / Yeni Birim Maliyet: ${Number(e.unitCostAfter).toLocaleString("tr-TR")} TL`,
          note: `${e.referenceNo ? `Ref: ${e.referenceNo}` : "-"} ${e.note ? `| ${e.note}` : ""}`.trim(),
        })),
      );
    }

    return ok({
      device: device
        ? {
            id: device.id,
            brand: device.brand,
            model: device.model,
            imei: device.imei,
            serialNumber: device.serialNumber,
            storage: device.storage,
            color: device.color,
            isSecondHandStock: device.isSecondHandStock,
            createdAt: device.createdAt.toISOString(),
          }
        : null,
      customer: device?.customer ?? null,
      stockItems: stockMatches.map((s) => ({
        id: s.id,
        sku: s.sku,
        name: s.name,
        category: s.category,
        brand: s.brand,
        model: s.model,
        variantColor: s.variantColor,
        variantStorage: s.variantStorage,
        serialNumber: s.serialNumber,
        imei: s.imei,
        quantity: s.quantity,
        purchasePrice: Number(s.purchasePrice),
        salePrice: Number(s.salePrice),
        purchaseDocType: s.purchaseDocType,
        purchaseDocNo: s.purchaseDocNo,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      history: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}
