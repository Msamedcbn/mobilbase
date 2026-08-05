export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";

type StatCard = { label: string; value: string; sub: string; href: string; tone: "slate" | "blue" | "amber" | "rose" };

function toneClass(tone: StatCard["tone"]) {
  if (tone === "blue") return "border-blue-200 bg-blue-50";
  if (tone === "amber") return "border-amber-200 bg-amber-50";
  if (tone === "rose") return "border-rose-200 bg-rose-50";
  return "border-slate-200 bg-white";
}

export default async function QuickManagementPage() {
  let stockCount = 0;
  let openRepairs = 0;
  let receivable = 0;
  let todayIncome = 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const tenantId = getSessionUser()?.tenantId ?? null;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    stockCount = (store.stockItems || [])
      .filter((x) => x.tenantId === tenantId)
      .reduce((s, x) => s + Number(x.quantity || 0), 0);
    openRepairs = (store.repairs || []).filter((r) => {
      if (r.status === "DELIVERED" || r.status === "CANCELED") return false;
      const device = store.devices.find((d) => d.id === r.deviceId);
      const customer = device ? store.customers.find((c) => c.id === device.customerId) : null;
      return customer?.tenantId === tenantId;
    }).length;
    const tenantEntries = (store.accountEntries || []).filter((e) => {
      const customer = store.customers.find((c) => c.id === e.customerId);
      return customer?.tenantId === tenantId;
    });
    const debit = tenantEntries.filter((e) => e.type === "DEBIT").reduce((s, e) => s + Number(e.amount || 0), 0);
    const credit = tenantEntries.filter((e) => e.type === "CREDIT").reduce((s, e) => s + Number(e.amount || 0), 0);
    receivable = debit - credit;
    todayIncome = (store.transactions || [])
      .filter((t) => t.tenantId === tenantId && t.type === "INCOME" && new Date(t.createdAt) >= startOfDay)
      .reduce((s, t) => s + Number(t.totalAmount || 0), 0);
  } else {
    const [stockItems, repairAgg, debitAgg, creditAgg, incomeAgg] = await Promise.all([
      prisma.stockItem.aggregate({ where: { tenantId }, _sum: { quantity: true } }),
      prisma.repairRecord.count({ where: { status: { notIn: ["DELIVERED", "CANCELED"] }, device: { customer: { tenantId } } } }),
      prisma.accountEntry.aggregate({ where: { type: "DEBIT", customer: { tenantId } }, _sum: { amount: true } }),
      prisma.accountEntry.aggregate({ where: { type: "CREDIT", customer: { tenantId } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { tenantId, type: "INCOME", createdAt: { gte: startOfDay } }, _sum: { totalAmount: true } }),
    ]);

    stockCount = Number(stockItems._sum.quantity ?? 0);
    openRepairs = repairAgg;
    receivable = Number(debitAgg._sum.amount ?? 0) - Number(creditAgg._sum.amount ?? 0);
    todayIncome = Number(incomeAgg._sum.totalAmount ?? 0);
  }

  const cards: StatCard[] = [
    { label: "Anlik Stok", value: stockCount.toLocaleString("tr-TR"), sub: "Toplam adet", href: "/stok", tone: "slate" },
    { label: "Acik Servis", value: openRepairs.toLocaleString("tr-TR"), sub: "Bekleyen is", href: "/tamir-takip", tone: "amber" },
    { label: "Veresiye Bakiye", value: `${receivable.toLocaleString("tr-TR")} TL`, sub: "Net alacak", href: "/musteriler-veresiye", tone: "rose" },
    { label: "Bugunku Gelir", value: `${todayIncome.toLocaleString("tr-TR")} TL`, sub: "Nakit akis", href: "/dashboard?period=day", tone: "blue" },
  ];

  const quickActions = [
    { title: "POS Satis", desc: "Hizli satis islemi baslat", href: "/pos" },
    { title: "Yeni Servis Kaydi", desc: "Cihaz kabul kaydi olustur", href: "/tamir-takip" },
    { title: "Kurumsal Teklif", desc: "Teklif hazirla ve gonder", href: "/kurumsal-teklifler" },
    { title: "Toptan Islem", desc: "Alis/satis/transfer kaydi", href: "/toptan-alim-satis" },
    { title: "Gider Gir", desc: "Hizli gider kaydi ekle", href: "/giderler" },
    { title: "Seri/IMEI Sorgu", desc: "Cihaz gecmisini gor", href: "/seri-no-takip" },
  ];

  return (
    <section className="compact-shell" style={{ display: "grid", gap: 10 }}>
      <div className="panel" style={{ padding: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>Hızlı Yönetim</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Sade arayuz, hizli karar, detay islemlere tek tik erisim.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="field" style={{ width: 130, textAlign: "center" }} href="/dashboard">Detay Dashboard</Link>
          <a className="primary-btn" style={{ width: 130, textAlign: "center" }} href="/pos" target="_blank" rel="noopener noreferrer">Hizli Satis</a>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`panel ${toneClass(c.tone)}`} style={{ padding: "0.7rem 0.8rem", display: "grid", gap: 2 }}>
            <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>{c.label}</span>
            <strong style={{ fontSize: 20, lineHeight: 1.1 }}>{c.value}</strong>
            <span style={{ fontSize: 11, color: "#64748b" }}>{c.sub}</span>
          </Link>
        ))}
      </div>

      <div className="panel" style={{ padding: "0.8rem" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Hizli Islem Kutuphaneleri</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="panel" style={{ padding: "0.65rem 0.75rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{a.title}</p>
              <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
