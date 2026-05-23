export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { BuybackTableClient } from "./buyback-table-client";

export default async function BuybackListPage() {
  let items: Array<any> = [];
  let dbUnavailable = false;

  try {
    items = await prisma.buybackDeal.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, device: true },
      take: 50,
    });
  } catch {
    dbUnavailable = true;
  }

  return (
    <section>
      <h2 className="page-title">Ikinci El Islemleri</h2>
      {dbUnavailable && <div className="empty-box">Veritabani baglantisi yok. Kayitlar gosterilemiyor.</div>}
      <BuybackTableClient
        initialItems={items.map((item) => ({
          id: item.id,
          customerName: item.customer?.fullName ?? "-",
          deviceName: `${item.device?.brand ?? ""} ${item.device?.model ?? ""}`.trim(),
          offeredPrice: Number(item.offeredPrice),
          agreedPrice: item.agreedPrice == null ? null : Number(item.agreedPrice),
          status: item.status,
        }))}
      />
    </section>
  );
}
