import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser, getEffectiveTenantId } from "@/lib/auth";
import { VeriAnaliziFilters } from "@/components/veri-analizi-filters";
import { DownloadCsvButton } from "@/components/export-csv-button";
import { rowsToCsv } from "@/lib/csv-export";

type Period = "day" | "week" | "month" | "all";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Karti",
  ON_ACCOUNT: "Veresiye",
  BANK_TRANSFER: "Havale/EFT",
};

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
  staffUserId: string | null;
  staffName: string | null;
};

type SoldItemRow = {
  id: string;
  createdAt: Date;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  estCost: number;
  paymentMethod: string;
  staffName: string | null;
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

type Financials = {
  rows: Row[];
  soldItemRows: SoldItemRow[];
  purchaseRows: PurchaseRow[];
  dbUnavailable: boolean;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalSoldRevenue: number;
  totalEstCost: number;
  grossProfit: number;
  totalPurchaseCost: number;
  branchBreakdown: { name: string; total: number; count: number }[];
  unassignedIncome: number;
  staffBreakdown: { name: string; total: number; count: number }[];
  unassignedStaffIncome: number;
};

// Shared by the primary window and (optionally) the comparison window, so the
// two always agree on exactly how each number is derived.
async function loadFinancials(tenantId: string | null, periodStart: Date | null, periodEnd: Date | null): Promise<Financials> {
  const dateWhere = periodStart ? { gte: periodStart, ...(periodEnd ? { lte: periodEnd } : {}) } : undefined;

  let rows: Row[] = [];
  let dbUnavailable = false;

  try {
    if (isDbDisabledMode()) {
      dbUnavailable = true;
      const store = await readLocalStore();
      const branches = store.branches || [];
      const customers = store.customers || [];
      const users = store.users || [];
      rows = (store.transactions || [])
        .filter((t) => t.tenantId === tenantId && (t.type === "INCOME" || t.type === "EXPENSE"))
        .filter((t) => !periodStart || new Date(t.createdAt) >= periodStart)
        .filter((t) => !periodEnd || new Date(t.createdAt) <= periodEnd)
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
          staffUserId: t.soldByUserId ?? null,
          staffName: users.find((u) => u.id === t.soldByUserId)?.fullName ?? null,
        }));
    } else {
      const txs = await prisma.transaction.findMany({
        where: {
          tenantId,
          type: { in: ["INCOME", "EXPENSE"] },
          ...(dateWhere ? { createdAt: dateWhere } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { branch: true, customer: true, soldByUser: { select: { fullName: true } } },
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
        staffUserId: t.soldByUserId,
        staffName: t.soldByUser?.fullName ?? null,
      }));
    }
  } catch {
    dbUnavailable = true;
  }

  let soldItemRows: SoldItemRow[] = [];
  let purchaseRows: PurchaseRow[] = [];

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      purchaseRows = (store.stockItems || [])
        .filter((s) => s.tenantId === tenantId && !s.isCatalog && s.quantity > 0)
        .filter((s) => !periodStart || new Date(s.purchaseDate || s.createdAt || Date.now()) >= periodStart)
        .filter((s) => !periodEnd || new Date(s.purchaseDate || s.createdAt || Date.now()) <= periodEnd)
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
            ...(dateWhere ? { createdAt: dateWhere } : {}),
          },
        },
        include: {
          product: true,
          transaction: { select: { createdAt: true, paymentMethod: true, soldByUser: { select: { fullName: true } } } },
        },
        orderBy: { transaction: { createdAt: "desc" } },
        take: 300,
      });
      soldItemRows = soldItems.map((ti) => {
        const unitCost = Number(ti.unitCost) > 0 ? Number(ti.unitCost) : Number(ti.product?.purchasePrice ?? 0);
        return {
          id: ti.id,
          createdAt: ti.transaction.createdAt,
          productName: ti.product?.name ?? "Bilinmeyen Ürün",
          quantity: ti.quantity,
          unitPrice: Number(ti.unitPrice),
          lineTotal: Number(ti.lineTotal),
          estCost: ti.quantity * unitCost,
          paymentMethod: ti.transaction.paymentMethod,
          staffName: ti.transaction.soldByUser?.fullName ?? null,
        };
      });

      const stockItems = await prisma.stockItem.findMany({
        where: {
          tenantId,
          isCatalog: false,
          ...(dateWhere ? { purchaseDate: dateWhere } : {}),
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

  const staffMap = new Map<string, { name: string; total: number; count: number }>();
  for (const r of incomeRows) {
    const key = r.staffUserId ?? "__unassigned__";
    const name = r.staffName ?? "Atanmamış";
    const entry = staffMap.get(key) ?? { name, total: 0, count: 0 };
    entry.total += r.totalAmount;
    entry.count += 1;
    staffMap.set(key, entry);
  }
  const staffBreakdown = Array.from(staffMap.values()).sort((a, b) => b.total - a.total);
  const unassignedStaffIncome = staffMap.get("__unassigned__")?.total ?? 0;

  return {
    rows,
    soldItemRows,
    purchaseRows,
    dbUnavailable,
    totalIncome,
    totalExpense,
    netProfit,
    totalSoldRevenue,
    totalEstCost,
    grossProfit,
    totalPurchaseCost,
    branchBreakdown,
    unassignedIncome,
    staffBreakdown,
    unassignedStaffIncome,
  };
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    if (current === 0) return null;
    return <span className="ml-2 text-[11px] font-bold text-emerald-600">yeni</span>;
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  return (
    <span className={`ml-2 text-[11px] font-bold ${up ? "text-emerald-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default async function VeriAnaliziPage({
  searchParams,
}: {
  searchParams?: { period?: string; from?: string; to?: string; compare?: string };
}) {
  const rawFrom = searchParams?.from;
  const isCustomRange = !!rawFrom;

  const selectedPeriod: Period =
    searchParams?.period === "day" || searchParams?.period === "week" || searchParams?.period === "month" || searchParams?.period === "all"
      ? (searchParams.period as Period)
      : "month";

  let periodStart: Date | null;
  let periodEnd: Date | null = null;

  if (isCustomRange) {
    periodStart = new Date(`${rawFrom}T00:00:00`);
    periodEnd = searchParams?.to ? new Date(`${searchParams.to}T23:59:59.999`) : new Date();
  } else {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    periodStart =
      selectedPeriod === "day" ? startOfDay : selectedPeriod === "week" ? startOfWeek : selectedPeriod === "month" ? startOfMonth : null;
  }

  const sessionUser = getSessionUser();
  const tenantId = await getEffectiveTenantId(sessionUser);

  const data = await loadFinancials(tenantId, periodStart, periodEnd);

  const compareEnabled = isCustomRange && searchParams?.compare === "1" && !!periodStart;
  let compareData: Financials | null = null;
  let comparePeriodStart: Date | null = null;
  let comparePeriodEnd: Date | null = null;
  if (compareEnabled && periodStart) {
    const effectiveEnd = periodEnd ?? new Date();
    const durationMs = effectiveEnd.getTime() - periodStart.getTime();
    comparePeriodEnd = new Date(periodStart.getTime() - 1);
    comparePeriodStart = new Date(comparePeriodEnd.getTime() - durationMs);
    compareData = await loadFinancials(tenantId, comparePeriodStart, comparePeriodEnd);
  }

  const {
    rows,
    soldItemRows,
    purchaseRows,
    dbUnavailable,
    totalIncome,
    totalExpense,
    netProfit,
    grossProfit,
    totalPurchaseCost,
    branchBreakdown,
    unassignedIncome,
    staffBreakdown,
    unassignedStaffIncome,
  } = data;

  const incomeRows = rows.filter((r) => r.type === "INCOME");
  const expenseRows = rows.filter((r) => r.type === "EXPENSE");

  const soldItemsCsv = rowsToCsv(soldItemRows, [
    { header: "Tarih", accessor: (r) => r.createdAt.toLocaleDateString("tr-TR") },
    { header: "Ürün", accessor: (r) => r.productName },
    { header: "Adet", accessor: (r) => r.quantity },
    { header: "Tutar (TL)", accessor: (r) => r.lineTotal },
    { header: "Tahmini Kâr (TL)", accessor: (r) => r.lineTotal - r.estCost },
    { header: "Ödeme", accessor: (r) => PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod },
    { header: "Personel", accessor: (r) => r.staffName ?? "" },
  ]);
  const incomeCsv = rowsToCsv(incomeRows, [
    { header: "Tarih", accessor: (r) => r.createdAt.toLocaleDateString("tr-TR") },
    { header: "Şube", accessor: (r) => r.branchName ?? "Şubesiz" },
    { header: "Ödeme", accessor: (r) => PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod },
    { header: "Tutar (TL)", accessor: (r) => r.totalAmount },
  ]);
  const expenseCsv = rowsToCsv(expenseRows, [
    { header: "Tarih", accessor: (r) => r.createdAt.toLocaleDateString("tr-TR") },
    { header: "Şube", accessor: (r) => r.branchName ?? "Şubesiz" },
    { header: "Açıklama", accessor: (r) => r.note ?? "" },
    { header: "Tutar (TL)", accessor: (r) => r.totalAmount },
  ]);

  const periodLabel = isCustomRange
    ? `${periodStart!.toLocaleDateString("tr-TR")} – ${(periodEnd ?? new Date()).toLocaleDateString("tr-TR")}`
    : selectedPeriod === "day"
    ? "Günlük"
    : selectedPeriod === "week"
    ? "Haftalık"
    : selectedPeriod === "month"
    ? "Aylık"
    : "Tüm Zamanlar";

  return (
    <div className="space-y-6">
      {dbUnavailable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Veritabanına şu anda ulaşılamıyor, veriler eksik olabilir.
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <span>📊 Mini ERP Finansal Analiz</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-black tracking-tight text-slate-900 leading-none">Gelir - Gider & Net Kâr (P&L)</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-lg">
            Satışlar, satılan malın maliyeti (COGS), işletme giderleri ve personel ödemeleriyle hesaplanan konsolide ERP Finans Tablosu.
          </p>
        </div>
        <VeriAnaliziFilters
          selectedPeriod={selectedPeriod}
          isCustomRange={isCustomRange}
          fromValue={searchParams?.from ?? ""}
          toValue={searchParams?.to ?? ""}
          compareEnabled={compareEnabled}
        />
      </div>

      {compareEnabled && compareData && comparePeriodStart && comparePeriodEnd && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-800">
          <strong>Karşılaştırma dönemi:</strong> {comparePeriodStart.toLocaleDateString("tr-TR")} – {comparePeriodEnd.toLocaleDateString("tr-TR")}{" "}
          (seçili dönemle aynı uzunlukta, hemen öncesi)
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-600 opacity-80" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Toplam Hasılat (Gelir)</p>
          <h3 className="mt-3 text-2xl font-black text-slate-800 font-mono tracking-tight">
            {totalIncome.toLocaleString("tr-TR")} TL
            {compareData && <DeltaBadge current={totalIncome} previous={compareData.totalIncome} />}
          </h3>
          <p className="mt-1 text-xs text-slate-400">POS Satışları + Teknik Servis Tahsilatları</p>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} İşletme Giderleri</p>
          <h3 className="mt-3 text-2xl font-black text-rose-600 font-mono tracking-tight">
            {totalExpense > 0 ? "-" : ""}
            {totalExpense.toLocaleString("tr-TR")} TL
            {compareData && <DeltaBadge current={totalExpense} previous={compareData.totalExpense} />}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Kira, Fatura, Yemek, Kargo vb. Harcamalar</p>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Net Faaliyet Kârı</p>
          <h3 className={`mt-3 text-2xl font-black font-mono tracking-tight ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {netProfit.toLocaleString("tr-TR")} TL
            {compareData && <DeltaBadge current={netProfit} previous={compareData.netProfit} />}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Konsolide Net Nakit Dengesi</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Brüt Kâr Marjı (COGS Düşülmüş)</p>
          <h3 className={`mt-3 text-2xl font-black font-mono tracking-tight ${grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {grossProfit.toLocaleString("tr-TR")} TL
            {compareData && <DeltaBadge current={grossProfit} previous={compareData.grossProfit} />}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Satılan ürün geliri − güncel/kayıtlı alış maliyeti (COGS).</p>
        </div>
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Girişi Yapılan Ürün / Stok Değeri</p>
          <h3 className="mt-3 text-2xl font-black text-slate-800 font-mono tracking-tight">
            {totalPurchaseCost.toLocaleString("tr-TR")} TL
            {compareData && <DeltaBadge current={totalPurchaseCost} previous={compareData.totalPurchaseCost} />}
          </h3>
          <p className="mt-1 text-xs text-slate-400">Bu dönemde stok girişi / toptan alımı yapılan ürünlerin toplam maliyeti.</p>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800">Ne Sattım?</h3>
            <DownloadCsvButton
              csv={soldItemsCsv}
              rowCount={soldItemRows.length}
              filename={`ne-sattim-${periodLabel.replace(/\s/g, "-")}`}
            />
          </div>
          <p className="text-xs text-slate-500 mb-4">Ürün bazlı satış detayı, satış anındaki maliyete göre tahmini kâr, ödeme yöntemi ve satışı yapan personel ile.</p>
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
                    <th className="text-xs">Ödeme</th>
                    <th className="text-xs">Personel</th>
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
                        <td className="text-xs text-slate-600">{PAYMENT_LABELS[r.paymentMethod] ?? r.paymentMethod}</td>
                        <td className="text-xs text-slate-600">{r.staffName ?? "—"}</td>
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

      <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Personel Bazlı Satış Dağılımı</h3>
        <p className="text-xs text-slate-500 mb-4">
          Hangi personel ne kadar ciro yaptı — satış sırasında oturum açan kullanıcıya göre.
          {unassignedStaffIncome > 0 && ` Şu an ${unassignedStaffIncome.toLocaleString("tr-TR")} TL personel ataması olmadan görünüyor.`}
        </p>
        {staffBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400">Bu dönemde gelir kaydı yok.</p>
        ) : (
          <div className="space-y-2">
            {staffBreakdown.map((s) => {
              const pct = totalIncome > 0 ? (s.total / totalIncome) * 100 : 0;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold w-40 truncate ${s.name === "Atanmamış" ? "text-amber-600" : "text-slate-700"}`}>{s.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${s.name === "Atanmamış" ? "bg-amber-400" : "bg-purple-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-600 w-28 text-right">{s.total.toLocaleString("tr-TR")} TL</span>
                  <span className="text-2xs text-slate-400 w-16 text-right">{s.count} işlem</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6 bg-white rounded-2xl border border-slate-200/80">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800">Gelir Tablosu</h3>
            <DownloadCsvButton
              csv={incomeCsv}
              rowCount={incomeRows.length}
              filename={`gelir-tablosu-${periodLabel.replace(/\s/g, "-")}`}
            />
          </div>
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
          <div className="flex items-start justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800">Gider Tablosu</h3>
            <DownloadCsvButton
              csv={expenseCsv}
              rowCount={expenseRows.length}
              filename={`gider-tablosu-${periodLabel.replace(/\s/g, "-")}`}
            />
          </div>
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
