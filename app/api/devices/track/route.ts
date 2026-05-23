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
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      
      const device = store.devices.find(
        (d) => 
          (d.imei && d.imei.toLowerCase() === query.toLowerCase()) || 
          (d.serialNumber && d.serialNumber.toLowerCase() === query.toLowerCase())
      );

      if (!device) {
        return fail("Cihaz bulunamadı", "NOT_FOUND", 404);
      }

      const customer = store.customers.find((c) => c.id === device.customerId) ?? null;
      
      const repairs = (store.repairs || [])
        .filter((r) => r.deviceId === device.id)
        .map((r) => ({
          id: r.id,
          type: "REPAIR",
          date: r.receivedAt,
          title: "Tamir/Onarım Kaydı",
          status: r.status,
          detail: r.issueDescription,
          note: r.diagnosisNote || "-",
          costs: {
            laborCost: Number(r.laborCost || 0),
            partCost: Number(r.partCost || 0),
            totalCost: Number(r.totalCost || 0),
          },
          completedAt: r.completedAt || null,
        }));

      return ok({
        device,
        customer,
        history: repairs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      });
    }

    const device = await prisma.device.findFirst({
      where: {
        OR: [
          { imei: { equals: query, mode: "insensitive" } },
          { serialNumber: { equals: query, mode: "insensitive" } },
        ],
      },
      include: {
        customer: true,
        repairRecords: {
          orderBy: { receivedAt: "desc" },
        },
      },
    });

    if (!device) {
      return fail("Cihaz bulunamadı", "NOT_FOUND", 404);
    }

    const repairs = device.repairRecords.map((r) => ({
      id: r.id,
      type: "REPAIR",
      date: r.receivedAt.toISOString(),
      title: "Tamir/Onarım Kaydı",
      status: r.status,
      detail: r.issueDescription,
      note: r.diagnosisNote || "-",
      costs: {
        laborCost: Number(r.laborCost),
        partCost: Number(r.partCost),
        totalCost: Number(r.totalCost),
      },
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    }));

    const history = repairs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return ok({
      device: {
        id: device.id,
        brand: device.brand,
        model: device.model,
        imei: device.imei,
        serialNumber: device.serialNumber,
        storage: device.storage,
        color: device.color,
        isSecondHandStock: device.isSecondHandStock,
        createdAt: device.createdAt.toISOString(),
      },
      customer: device.customer,
      history,
    });
  } catch (error) {
    return fail(getErrorMessage(error), getErrorCode(error), getErrorStatus(error));
  }
}

