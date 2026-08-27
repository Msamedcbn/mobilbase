export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";

type StatCard = { label: string; value: string; sub: string; href: string; tone: "slate" | "blue" | "amber" | "rose"; icon: JSX.Element };

function toneClass(tone: StatCard["tone"]) {
  if (tone === "blue") return "border-blue-200 bg-blue-50/60 text-blue-600";
  if (tone === "amber") return "border-amber-200 bg-amber-50/60 text-amber-600";
  if (tone === "rose") return "border-rose-200 bg-rose-50/60 text-rose-600";
  return "border-slate-200 bg-white text-slate-500";
}

function IconIn({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconWrench({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.35-.147.729-.242 1.126-.282M14.87 11.334l-2.51-2.51m5.108-.233c.35-.147.729-.242 1.126-.282m-6.234.515a2.75 2.75 0 00-3.856 0l-2.121 2.121m8.11-.633c.35-.147.729-.242 1.126-.282" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-8.25 4.5m0 0L3.75 7.5M12 12v9m8.25-4.5V7.5a2.25 2.25 0 00-1.125-1.947l-6.75-3.9a2.25 2.25 0 00-2.25 0l-6.75 3.9A2.25 2.25 0 003 7.5v6.75a2.25 2.25 0 001.125 1.947l6.75 3.9a2.25 2.25 0 002.25 0l6.75-3.9A2.25 2.25 0 0020.25 16.5z" />
    </svg>
  );
}

function IconBanknote({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-4.5-9.75h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5z" />
    </svg>
  );
}

const QUICK_ACTION_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  "/pos": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-4.5-9.75h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5z" />
    </svg>
  ),
  "/tamir-takip": IconWrench,
  "/kurumsal-teklifler": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  ),
  "/toptan-alim-satis": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  "/giderler": IconBanknote,
  "/seri-no-takip": ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

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
    { label: "Anlik Stok", value: stockCount.toLocaleString("tr-TR"), sub: "Toplam adet", href: "/stok", tone: "slate", icon: <IconBox className="w-5 h-5" /> },
    { label: "Acik Servis", value: openRepairs.toLocaleString("tr-TR"), sub: "Bekleyen is", href: "/tamir-takip", tone: "amber", icon: <IconWrench className="w-5 h-5" /> },
    { label: "Veresiye Bakiye", value: `${receivable.toLocaleString("tr-TR")} TL`, sub: "Net alacak", href: "/musteriler-veresiye", tone: "rose", icon: <IconUsers className="w-5 h-5" /> },
    { label: "Bugunku Gelir", value: `${todayIncome.toLocaleString("tr-TR")} TL`, sub: "Nakit akis", href: "/dashboard?period=day", tone: "blue", icon: <IconIn className="w-5 h-5" /> },
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
    <section className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title !m-0">Hızlı Yönetim</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Sade arayüz, hızlı karar, detay işlemlere tek tık erişim.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Detay Dashboard
          </Link>
          <a href="/pos" target="_blank" rel="noopener noreferrer" className="primary-btn text-xs py-2 px-4">
            Hızlı Satış
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group panel p-4 flex flex-col gap-2 border ${toneClass(c.tone)}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
              <span className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">{c.icon}</span>
            </div>
            <strong className="text-xl font-black text-slate-900 font-mono leading-tight">{c.value}</strong>
            <span className="text-xs text-slate-500">{c.sub}</span>
          </Link>
        ))}
      </div>

      <div className="panel p-4 md:p-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Hızlı İşlem Kütüphaneleri</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
          {quickActions.map((a) => {
            const ActionIcon = QUICK_ACTION_ICONS[a.href];
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group rounded-xl border border-slate-200 bg-white p-3.5 flex items-start gap-3 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200">
                  {ActionIcon ? <ActionIcon className="w-4.5 h-4.5" /> : null}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{a.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
