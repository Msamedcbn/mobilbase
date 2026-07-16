export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

type Period = "day" | "week" | "month" | "all";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Karti",
  ON_ACCOUNT: "Veresiye",
  BANK_TRANSFER: "Havale/EFT",
};

export default async function VeriAnaliziPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const selectedPeriod: Period =
    searchParams?.period === "day" || searchParams?.period === "week" || searchParams?.period === "month" || searchParams?.period === "all"
      ? (searchParams.period as Period)
      : "month";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const periodStart =
    selectedPeriod === "day" ? startOfDay : selectedPeriod === "week" ? startOfWeek : selectedPeriod === "month" ? startOfMonth : null;

  const sessionUser = getSessionUser();
  const tenantId = sessionUser?.tenantId || null;

  type Row = {
    id: string;
    transactionNo: string;
    type: "INCOME" | "EXPENSE";
    paymentMethod: string;
    totalAmount: number;
    note: string | null;
    createdAt: Date;
    branchId: string | null;
    branchName: string | null;
    customerName: string | null;
  };

  let rows: Row[] = [];
  let dbUnavailable = false;

  try {
    if (isDbDisabledMode()) {
      dbUnavailable = true;
      const store = await readLocalStore();
      const branches = store.branches || [];
      const customers = store.customers || [];
      rows = (store.transactions || [])
        .filter((t) => t.tenantId === tenantId && (t.type === "INCOME" || t.type === "EXPENSE"))
        .filter((t) => !periodStart || new Date(t.createdAt) >= periodStart)
        .map((t) => ({
          id: t.id,
          transactionNo: t.transactionNo,
          type: t.type as "INCOME" | "EXPENSE",
          paymentMethod: t.paymentMethod,
          totalAmount: Number(t.totalAmount),
          note: t.note ?? null,
          createdAt: new Date(t.createdAt),
          branchId: t.branchId ?? null,
          branchName: branches.find((b) => b.id === t.branchId)?.name ?? null,
          customerName: customers.find((c) => c.id === t.customerId)?.fullName ?? null,
        }));
    } else {
      const txs = await prisma.transaction.findMany({
        where: {
          tenantId,
          type: { in: ["INCOME", "EXPENSE"] },
          ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { branch: true, customer: true },
      });
      rows = txs.map((t) => ({
        id: t.id,
        transactionNo: t.transactionNo,
        type: t.type as "INCOME" | "EXPENSE",
        paymentMethod: t.paymentMethod,
        totalAmount: Number(t.totalAmount),
        note: t.note,
        createdAt: t.createdAt,
        branchId: t.branchId,
        branchName: t.branch?.name ?? null,
        customerName: t.customer?.fullName ?? null,
      }));
    }
  } catch {
    dbUnavailable = true;
  }

  type SoldItemRow = {
    id: string;
    createdAt: Date;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    estCost: number;
  };

  type PurchaseRow = {
    id: string;
    purchaseDate: Date;
    name: string;
    sku: string;
    quantity: number;
    purchasePrice: number;
    totalCost: number;
  };

  let soldItemRows: SoldItemRow[] = [];
  let purchaseRows: PurchaseRow[] = [];

  try {
    if (isDbDisabledMode()) {
      // Local-store mode doesn't persist per-line sale items, only stock intake.
      const store = await readLocalStore();
      purchaseRows = (store.stockItems || [])
        .filter((s) => s.tenantId === tenantId && !s.isCatalog && s.quantity > 0)
        .filter((s) => !periodStart || new Date(s.purchaseDate || s.createdAt || Date.now()) >= periodStart)
        .map((s) => ({
          id: s.id,
          purchaseDate: new Date(s.purchaseDate || s.createdAt || Date.now()),
          name: s.name,
          sku: s.sku,
          quantity: s.quantity,
          purchasePrice: Number(s.purchasePrice),
          totalCost: Number(s.purchasePrice) * s.quantity,
        }));
    } else {
      const soldItems = await prisma.transactionItem.findMany({
        where: {
          transaction: {
            type: "INCOME",
            tenantId,
            ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
          },
        },
        include: { product: true, transaction: { select: { createdAt: true } } },
        orderBy: { transaction: { createdAt: "desc" } },
        take: 300,
      });
      soldItemRows = soldItems.map((ti) => ({
        id: ti.id,
        createdAt: ti.transaction.createdAt,
        productName: ti.product?.name ?? "Bilinmeyen Ürün",
        quantity: ti.quantity,
        unitPrice: Number(ti.unitPrice),
        lineTotal: Number(ti.lineTotal),
        estCost: ti.quantity * Number(ti.product?.purchasePrice ?? 0),
      }));

      const stockItems = await prisma.stockItem.findMany({
        where: {
          tenantId,
          isCatalog: false,
          ...(periodStart ? { purchaseDate: { gte: periodStart } } : {}),
        },
        orderBy: { purchaseDate: "desc" },
        take: 300,
      });
      purchaseRows = stockItems.map((s) => ({
        id: s.id,
        purchaseDate: s.purchaseDate,
        name: s.name,
        sku: s.sku,
        quantity: s.quantity,
        purchasePrice: Number(s.purchasePrice),
        totalCost: Number(s.purchasePrice) * s.quantity,
      }));
    }
  } catch {
    // best-effort — leave arrays empty rather than failing the whole page
  }

  const totalSoldRevenue = soldItemRows.reduce((sum, r) => sum + r.lineTotal, 0);
  const totalEstCost = soldItemRows.reduce((sum, r) => sum + r.estCost, 0);
  const grossProfit = totalSoldRevenue - totalEstCost;
  const totalPurchaseCost = purchaseRows.reduce((sum, r) => sum + r.totalCost, 0);

  const incomeRows = rows.filter((r) => r.type === "INCOME");
  const expenseRows = rows.filter((r) => r.type === "EXPENSE");
  const totalIncome = incomeRows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalExpense = expenseRows.reduce((sum, r) => sum + r.totalAmount, 0);
  const netProfit = totalIncome - totalExpense;

  // Branch breakdown for income — surfaces sales that never got a branch assigned,
  // which is why branch-level ciro reports can undercount vs. this page's totals.
  const branchMap = new Map<string, { name: string; total: number; count: number }>();
  for (const r of incomeRows) {
    const key = r.branchId ?? "__unassigned__";
    const name = r.branchName ?? "Şubesiz Satışlar";
    const entry = branchMap.get(key) ?? { name, total: 0, count: 0 };
    entry.total += r.totalAmount;
    entry.count += 1;
    branchMap.set(key, entry);
  }
  const branchBreakdown = Array.from(branchMap.values()).sort((a, b) => b.total - a.total);
  const unassignedIncome = branchMap.get("__unassigned__")?.total ?? 0;

  const periodLabel =
    selectedPeriod === "day" ? "Günlük" : selectedPeriod === "week" ? "Haftalık" : selectedPeriod === "month" ? "Aylık" : "Tüm Zamanlar";

  return (
    <div className="space-y-6">
      {dbUnavailable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Veritabanına şu anda ulaşılamıyor, veriler eksik olabilir.
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:max-w-xl">
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-black tracking-tight text-slate-900 leading-none">Veri Analizi</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-lg">
            Ne sattım, ne aldım, ne kadar kâr ettim — gelir/gider, ürün bazlı satış/alış ve şube dağılımı, gerçek işlem kayıtlarından.
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm">
          <Link href="/veri-analizi?period=day" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "day" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Günlük</Link>
          <Link href="/veri-analizi?period=week" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "week" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Haftalık</Link>
          <Link href="/veri-analizi?period=month" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "month" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Aylık</Link>
          <Link href="/veri-analizi?period=all" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Tümü</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-600 opacity-80" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Toplam Gelir</p>
          <h3 className="mt-3 text-2xl font-black text-slate-800 font-mono tracking-tight">{totalIncome.toLocaleString("tr-TR")} TL</h3>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Toplam Gider</p>
          <h3 className="mt-3 text-2xl font-black text-rose-600 font-mono tracking-tight">{totalExpense > 0 ? "-" : ""}{totalExpense.toLocaleString("tr-TR")} TL</h3>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Net Kar</p>
          <h3 className={`mt-3 text-2xl font-black font-mono tracking-tight ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{netProfit.toLocaleString("tr-TR")} TL</h3>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Brüt Kâr (Satış Maliyetine Göre)</p>
          <h3 className={`mt-3 text-2xl font-black font-mono tracking-tight ${grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{grossProfit.toLocaleString("tr-TR")} TL</h3>
          <p className="mt-1 text-xs text-slate-400">Satılan ürün geliri − güncel alış fiyatına göre tahmini maliyet. Diğer giderleri (kira, maaş vb.) içermez.</p>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Alınan Ürünlerin Stok Değeri</p>
          <h3 className="mt-3 text-2xl font-black text-slate-800 font-mono tracking-tight">{totalPurchaseCost.toLocaleString("tr-TR")} TL</h3>
          <p className="mt-1 text-xs text-slate-400">Bu dönemde stok kartı açılan/güncellenen ürünlerin güncel stok adedi × alış fiyatı. Sonradan satılan ürünlerde güncel adet düştüğü için gerçek harcanan tutardan düşük çıkabilir.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Ne Sattım?</h3>
          <p className="text-xs text-slate-500 mb-4">Ürün bazlı satış detayı, güncel alış fiyatına göre tahmini kâr ile.</p>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {soldItemRows.length === 0 ? (
              <p className="text-sm text-slate-400">{dbUnavailable ? "Bu görünüm gerçek veritabanı gerektirir." : "Bu dönemde satış kaydı yok."}</p>
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-xs">Tarih</th>
                    <th className="text-xs">Ürün</th>
                    <th className="text-xs text-right">Adet</th>
                    <th className="text-xs text-right">Tutar</th>
                    <th className="text-xs text-right">Tah. Kâr</th>
                  </tr>
                </thead>
                <tbody>
                  {soldItemRows.slice(0, 150).map((r) => {
                    const margin = r.lineTotal - r.estCost;
                    return (
                      <tr key={r.id}>
                        <td className="text-xs text-slate-600">{r.createdAt.toLocaleDateString("tr-TR")}</td>
                        <td className="text-xs text-slate-700 font-semibold">{r.productName}</td>
                        <td className="text-xs text-slate-600 text-right">{r.quantity}</td>
                        <td className="text-xs font-mono font-bold text-emerald-700 text-right">{r.lineTotal.toLocaleString("tr-TR")} TL</td>
                        <td className={`text-xs font-mono font-bold text-right ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{margin.toLocaleString("tr-TR")} TL</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Ne Aldım?</h3>
          <p className="text-xs text-slate-500 mb-4">Bu dönemde stok kartı açılan/güncellenen ürünler. Adet ve maliyet güncel stok seviyesini yansıtır — satılan ürünlerde gerçek alım miktarından düşük görünebilir.</p>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {purchaseRows.length === 0 ? (
              <p className="text-sm text-slate-400">Bu dönemde stok girişi yok.</p>
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-xs">Tarih</th>
                    <th className="text-xs">Ürün</th>
                    <th className="text-xs text-right">Adet</th>
                    <th className="text-xs text-right">Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRows.slice(0, 150).map((r) => (
                    <tr key={r.id}>
                      <td className="text-xs text-slate-600">{r.purchaseDate.toLocaleDateString("tr-TR")}</td>
                      <td className="text-xs text-slate-700 font-semibold">{r.name}</td>
                      <td className="text-xs text-slate-600 text-right">{r.quantity}</td>
                      <td className="text-xs font-mono font-bold text-indigo-700 text-right">{r.totalCost.toLocaleString("tr-TR")} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Şube Bazlı Gelir Dağılımı</h3>
        <p className="text-xs text-slate-500 mb-4">
          Şube seçilmeden yapılan satışlar &quot;Şubesiz Satışlar&quot; altında toplanır ve şube bazlı ciro raporlarına yansımaz.
          {unassignedIncome > 0 && ` Şu an ${unassignedIncome.toLocaleString("tr-TR")} TL şubesiz görünüyor.`}
        </p>
        {branchBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400">Bu dönemde gelir kaydı yok.</p>
        ) : (
          <div className="space-y-2">
            {branchBreakdown.map((b) => {
              const pct = totalIncome > 0 ? (b.total / totalIncome) * 100 : 0;
              return (
                <div key={b.name} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-40 truncate ${b.name === "Şubesiz Satışlar" ? "text-amber-600" : "text-slate-700"}`}>{b.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${b.name === "Şubesiz Satışlar" ? "bg-amber-400" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 w-28 text-right">{b.total.toLocaleString("tr-TR")} TL</span>
                  <span className="text-2xs text-slate-400 w-16 text-right">{b.count} işlem</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Gelir Tablosu</h3>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {incomeRows.length === 0 ? (
              <p className="text-sm text-slate-400">Bu dönemde gelir kaydı yok.</p>
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-xs">Tarih</th>
                    <th className="text-xs">Şube</th>
                    <th className="text-xs">Ödeme</th>
                    <th className="text-xs text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRows.slice(0, 100).map((r) => (
                    <tr key={r.id}>
                      <td className="text-xs text-slate-600">{r.createdAt.toLocaleDateString("tr-TR")}</td>
                      <td className="text-xs text-slate-600">{r.branchName ?? "Şubesiz"}</td>
                      <td className="text-xs text-slate-600">{PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod}</td>
                      <td className="text-xs font-mono font-bold text-emerald-700 text-right">{r.totalAmount.toLocaleString("tr-TR")} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Gider Tablosu</h3>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {expenseRows.length === 0 ? (
              <p className="text-sm text-slate-400">Bu dönemde gider kaydı yok.</p>
            ) : (
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-xs">Tarih</th>
                    <th className="text-xs">Şube</th>
                    <th className="text-xs">Açıklama</th>
                    <th className="text-xs text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.slice(0, 100).map((r) => (
                    <tr key={r.id}>
                      <td className="text-xs text-slate-600">{r.createdAt.toLocaleDateString("tr-TR")}</td>
                      <td className="text-xs text-slate-600">{r.branchName ?? "Şubesiz"}</td>
                      <td className="text-xs text-slate-600">{r.note ?? "-"}</td>
                      <td className="text-xs font-mono font-bold text-rose-700 text-right">{r.totalAmount.toLocaleString("tr-TR")} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
