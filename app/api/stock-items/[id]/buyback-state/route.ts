import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { isValidBuybackProcessTransition } from "@/lib/buyback-stock";

const patchSchema = z.object({
  buybackProcessStatus: z.enum(["SERVICE_TRANSFERRED", "READY_FOR_SALE"]).optional(),
  buybackSaleEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireRole(["ADMIN", "CASHIER", "TECHNICIAN", "MANAGER"]);
  if (auth.error) return auth.error;

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Gecersiz buyback durum verisi." }, { status: 400 });
    }

    if (parsed.data.buybackProcessStatus === undefined && parsed.data.buybackSaleEnabled === undefined) {
      return NextResponse.json({ error: "Guncellenecek alan bulunamadi." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const idx = (store.stockItems || []).findIndex((x) => x.id === params.id && x.tenantId === auth.user.tenantId);
      if (idx === -1) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });

      const item = store.stockItems[idx] as any;
      if (!item.isBuybackItem) {
        return NextResponse.json({ error: "Bu urun buyback envanteri degil." }, { status: 400 });
      }

      if (parsed.data.buybackProcessStatus) {
        if (!isValidBuybackProcessTransition(item.buybackProcessStatus ?? null, parsed.data.buybackProcessStatus)) {
          return NextResponse.json({ error: "Gecersiz surec gecisi." }, { status: 400 });
        }
        item.buybackProcessStatus = parsed.data.buybackProcessStatus;
      }

      if (parsed.data.buybackSaleEnabled !== undefined) {
        if (parsed.data.buybackSaleEnabled && item.buybackProcessStatus !== "READY_FOR_SALE") {
          return NextResponse.json({ error: "Satisa acmak icin cihaz once Satisa Hazir olmalidir." }, { status: 400 });
        }
        item.buybackSaleEnabled = parsed.data.buybackSaleEnabled;
      }

      item.updatedAt = new Date().toISOString();
      await writeLocalStore(store);
      return NextResponse.json(item);
    }

    const item = await prisma.stockItem.findFirst({ where: { id: params.id, tenantId: auth.user.tenantId } });
    if (!item) return NextResponse.json({ error: "Urun bulunamadi." }, { status: 404 });
    if (!item.isBuybackItem) {
      return NextResponse.json({ error: "Bu urun buyback envanteri degil." }, { status: 400 });
    }

    const nextStatus = parsed.data.buybackProcessStatus;
    if (nextStatus && !isValidBuybackProcessTransition(item.buybackProcessStatus ?? null, nextStatus)) {
      return NextResponse.json({ error: "Gecersiz surec gecisi." }, { status: 400 });
    }

    const nextSaleEnabled = parsed.data.buybackSaleEnabled;
    if (nextSaleEnabled === true && (nextStatus ?? item.buybackProcessStatus) !== "READY_FOR_SALE") {
      return NextResponse.json({ error: "Satisa acmak icin cihaz once Satisa Hazir olmalidir." }, { status: 400 });
    }

    const updated = await prisma.stockItem.update({
      where: { id: params.id },
      data: {
        buybackProcessStatus: nextStatus ?? undefined,
        buybackSaleEnabled: nextSaleEnabled ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Buyback durum guncelleme basarisiz." }, { status: 500 });
  }
}
