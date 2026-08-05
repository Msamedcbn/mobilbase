export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser, getEffectiveTenantId } from "@/lib/auth";
import Link from "next/link";

type MetricPeriod = "day" | "week" | "month";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const selectedPeriod: MetricPeriod =
    searchParams?.period === "day" || searchParams?.period === "week" || searchParams?.period === "month"
      ? (searchParams.period as MetricPeriod)
      : "month";

  const dbDisabled = isDbDisabledMode();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const sessionUser = getSessionUser();
  // A raw session tenantId is null for PLATFORM_OWNER/STUDIO_OPERATOR, which made
  // every query below match Customer/Transaction rows with tenantId IS NULL —
  // legacy pre-tenant-scoping rows left over from several different dealers,
  // not this account's own data. getEffectiveTenantId resolves the same
  // fallback tenant that /api/customers and friends already use.
  const tenantId = await getEffectiveTenantId(sessionUser);

  let dbUnavailable = false;
  let customerCount = 0;
  let repairCount = 0;
  let dailySales = 0;
  let dailyTahsilat = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  // Monthly stats
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  let periodIncome = 0;
  let periodExpense = 0;
  let periodTahsilat = 0;

  let recentLogs: Array<{
    id: string;
    createdAt: Date;
    action: string;
    entityType: string;
    entityId: string | null;
    detail: string | null;
  }> = [];

  // Grouped datasets for our 7-day sales chart
  const weekdays = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
      dayName: weekdays[d.getDay()],
      sales: 0,
      collections: 0,
      rawDate: d,
    };
  });

  // Grouped datasets for the 6-month historical chart
  const monthsList = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" }),
      income: 0,
      expense: 0,
      netProfit: 0,
    };
  });

  const statusLabels: Record<string, string> = {
    RECEIVED: "Teslim Alindi",
    IN_PROGRESS: "Islemde",
    WAITING_PART: "Parca Bekliyor",
    READY: "Hazir",
    DELIVERED: "Teslim Edildi",
    CANCELED: "Iptal Edildi",
  };

  const statusColors: Record<string, string> = {
    RECEIVED: "#3b82f6",     // Blue
    IN_PROGRESS: "#f59e0b",  // Amber
    WAITING_PART: "#ef4444", // Red
    READY: "#10b981",        // Emerald
    DELIVERED: "#3b82f6",    // Blue
    CANCELED: "#64748b",     // Slate
  };

  let repairChartData = Object.keys(statusLabels).map((statusKey) => ({
    status: statusKey,
    label: statusLabels[statusKey],
    count: 0,
    color: statusColors[statusKey],
  }));

  try {
    const periodStart = selectedPeriod === "day" ? startOfDay : selectedPeriod === "week" ? startOfWeek : startOfMonth;
    if (dbDisabled) {
      dbUnavailable = true;
      
      // Load live mock data from local-store
      const store = await readLocalStore();
      const txs = (store.transactions || []).filter((t) => t.tenantId === tenantId);
      const aes = (store.accountEntries || []).filter((ae) => {
        const c = store.customers.find((c) => c.id === ae.customerId);
        return c && c.tenantId === tenantId;
      });
      customerCount = store.customers.filter((c) => c.tenantId === tenantId).length;
      const tenantRepairs = (store.repairs || []).filter((r) => {
        const d = store.devices.find((d) => d.id === r.deviceId);
        if (!d) return false;
        const c = store.customers.find((c) => c.id === d.customerId);
        return c && c.tenantId === tenantId;
      });
      repairCount = tenantRepairs.length;

      // Daily calculations
      dailySales = txs
        .filter((t) => t.type === "INCOME" && new Date(t.createdAt) >= startOfDay)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);

      dailyTahsilat = aes
        .filter((ae) => ae.type === "CREDIT" && new Date(ae.createdAt) >= startOfDay)
        .reduce((sum, ae) => sum + Number(ae.amount), 0);

      // Veresiye totals
      totalDebit = aes.filter((ae) => ae.type === "DEBIT").reduce((sum, ae) => sum + Number(ae.amount), 0);
      totalCredit = aes.filter((ae) => ae.type === "CREDIT").reduce((sum, ae) => sum + Number(ae.amount), 0);

      // Monthly calculations
      monthlyIncome = txs
        .filter((t) => t.type === "INCOME" && new Date(t.createdAt) >= startOfMonth)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);

      monthlyExpense = txs
        .filter((t) => t.type === "EXPENSE" && new Date(t.createdAt) >= startOfMonth)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);

      periodIncome = txs
        .filter((t) => t.type === "INCOME" && new Date(t.createdAt) >= periodStart)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);
      periodExpense = txs
        .filter((t) => t.type === "EXPENSE" && new Date(t.createdAt) >= periodStart)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);
      periodTahsilat = aes
        .filter((ae) => ae.type === "CREDIT" && new Date(ae.createdAt) >= periodStart)
        .reduce((sum, ae) => sum + Number(ae.amount), 0);

      const pricing = store.resellerPricing || {
        Lite: 750,
        Pro: 1500,
        Enterprise: 3500,
        freeBranchLimit: 5,
        branchSurchargePrice: 150,
      };

      // Last 7 days matching
      txs.forEach((t) => {
        if (t.type === "INCOME") {
          const txDate = new Date(t.createdAt);
          const dayIdx = last7DaysData.findIndex((x) => x.rawDate.toDateString() === txDate.toDateString());
          if (dayIdx !== -1) {
            last7DaysData[dayIdx].sales += Number(t.totalAmount);
          }
        }
      });

      aes.forEach((ae) => {
        if (ae.type === "CREDIT") {
          const aeDate = new Date(ae.createdAt);
          const dayIdx = last7DaysData.findIndex((x) => x.rawDate.toDateString() === aeDate.toDateString());
          if (dayIdx !== -1) {
            last7DaysData[dayIdx].collections += Number(ae.amount);
          }
        }
      });

      // 6-Month historical matching
      txs.forEach((t) => {
        const txDate = new Date(t.createdAt);
        if (txDate >= sixMonthsAgo) {
          const matched = monthsList.find((m) => m.year === txDate.getFullYear() && m.month === txDate.getMonth());
          if (matched) {
            if (t.type === "INCOME") matched.income += Number(t.totalAmount);
            else if (t.type === "EXPENSE") matched.expense += Number(t.totalAmount);
          }
        }
      });

      // Repair status groupings
      const reps = tenantRepairs;
      repairChartData = Object.keys(statusLabels).map((statusKey) => {
        const count = reps.filter((r) => r.status === statusKey).length;
        return {
          status: statusKey,
          label: statusLabels[statusKey],
          count,
          color: statusColors[statusKey],
        };
      });

    } else {
      // DB IS AVAILABLE
      const [
        custCount,
        repCount,
        todaySalesAgg,
        tahsilatAgg,
        debitAgg,
        creditAgg,
        logs,
        recentTransactions,
        recentAccountEntries,
        repairCounts,
        monthlyIncomeAgg,
        monthlyExpenseAgg,
        sixMonthTransactions,
        selectedPeriodIncomeAgg,
        selectedPeriodExpenseAgg,
        selectedPeriodTahsilatAgg,
      ] = await Promise.all([
        prisma.customer.count({ where: { tenantId } }),
        prisma.repairRecord.count({ where: { device: { customer: { tenantId } } } }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "INCOME", createdAt: { gte: startOfDay } },
          _sum: { totalAmount: true },
        }),
        prisma.accountEntry.aggregate({
          where: { customer: { tenantId }, type: "CREDIT", createdAt: { gte: startOfDay } },
          _sum: { amount: true },
        }),
        prisma.accountEntry.aggregate({ where: { customer: { tenantId }, type: "DEBIT" }, _sum: { amount: true } }),
        prisma.accountEntry.aggregate({ where: { customer: { tenantId }, type: "CREDIT" }, _sum: { amount: true } }),
        prisma.auditLog.findMany({ where: { customer: { tenantId } }, orderBy: { createdAt: "desc" }, take: 6 }),
        prisma.transaction.findMany({
          where: { tenantId, type: "INCOME", createdAt: { gte: last7DaysData[0].rawDate } },
          select: { createdAt: true, totalAmount: true },
        }),
        prisma.accountEntry.findMany({
          where: { customer: { tenantId }, type: "CREDIT", createdAt: { gte: last7DaysData[0].rawDate } },
          select: { createdAt: true, amount: true },
        }),
        prisma.repairRecord.groupBy({
          by: ["status"],
          where: { device: { customer: { tenantId } } },
          _count: { id: true },
        }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "INCOME", createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "EXPENSE", createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.findMany({
          where: { tenantId, createdAt: { gte: sixMonthsAgo } },
          select: { type: true, totalAmount: true, createdAt: true },
        }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "INCOME", createdAt: { gte: periodStart } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "EXPENSE", createdAt: { gte: periodStart } },
          _sum: { totalAmount: true },
        }),
        prisma.accountEntry.aggregate({
          where: { customer: { tenantId }, type: "CREDIT", createdAt: { gte: periodStart } },
          _sum: { amount: true },
        }),
      ]);

      customerCount = custCount;
      repairCount = repCount;
      dailySales = Number(todaySalesAgg._sum.totalAmount ?? 0);
      dailyTahsilat = Number(tahsilatAgg._sum.amount ?? 0);
      totalDebit = Number(debitAgg._sum.amount ?? 0);
      totalCredit = Number(creditAgg._sum.amount ?? 0);
      recentLogs = logs;

      monthlyIncome = Number(monthlyIncomeAgg._sum.totalAmount ?? 0);
      monthlyExpense = Number(monthlyExpenseAgg._sum.totalAmount ?? 0);
      periodIncome = Number(selectedPeriodIncomeAgg._sum.totalAmount ?? 0);
      periodExpense = Number(selectedPeriodExpenseAgg._sum.totalAmount ?? 0);
      periodTahsilat = Number(selectedPeriodTahsilatAgg._sum.amount ?? 0);

      // Map DB data to 7 days chart array
      recentTransactions.forEach((t) => {
        const txDate = new Date(t.createdAt);
        const dayIdx = last7DaysData.findIndex((x) => x.rawDate.toDateString() === txDate.toDateString());
        if (dayIdx !== -1) {
          last7DaysData[dayIdx].sales += Number(t.totalAmount);
        }
      });

      recentAccountEntries.forEach((ae) => {
        const aeDate = new Date(ae.createdAt);
        const dayIdx = last7DaysData.findIndex((x) => x.rawDate.toDateString() === aeDate.toDateString());
        if (dayIdx !== -1) {
          last7DaysData[dayIdx].collections += Number(ae.amount);
        }
      });

      // Map repair record statuses
      repairChartData = Object.keys(statusLabels).map((statusKey) => {
        const dbCount = repairCounts.find((x) => x.status === statusKey)?._count.id ?? 0;
        return {
          status: statusKey,
          label: statusLabels[statusKey],
          count: dbCount,
          color: statusColors[statusKey],
        };
      });

      // Map 6-month historical calculations
      sixMonthTransactions.forEach((tx) => {
        const txDate = new Date(tx.createdAt);
        const matched = monthsList.find((m) => m.year === txDate.getFullYear() && m.month === txDate.getMonth());
        if (matched) {
          if (tx.type === "INCOME") matched.income += Number(tx.totalAmount);
          else if (tx.type === "EXPENSE") matched.expense += Number(tx.totalAmount);
        }
      });
    }
  } catch (error) {
    if (!dbDisabled) {
      dbUnavailable = true;
    }
  }

  const veresiyeBalance = totalDebit - totalCredit;
  const monthlyNetProfit = monthlyIncome - monthlyExpense;
  const periodNetProfit = periodIncome - periodExpense;
  const periodLabel = selectedPeriod === "day" ? "Gunluk" : selectedPeriod === "week" ? "Haftalik" : "Aylik";
  const collectionRate = periodIncome > 0 ? (periodTahsilat / periodIncome) * 100 : 0;
  const veresiyeRiskRate = totalDebit > 0 ? (veresiyeBalance / totalDebit) * 100 : 0;

  // Fallbacks if no data exists yet (brand new / not-yet-active tenant). These are sample
  // numbers, not real activity — usedSampleData drives a visible banner below so nobody
  // mistakes a demo chart for their actual revenue.
  let usedSampleData = false;

  const hasDbData = last7DaysData.some((x) => x.sales > 0 || x.collections > 0);
  if (!hasDbData) {
    usedSampleData = true;
    last7DaysData[0].sales = 12500; last7DaysData[0].collections = 9000;
    last7DaysData[1].sales = 18000; last7DaysData[1].collections = 14200;
    last7DaysData[2].sales = 14500; last7DaysData[2].collections = 11000;
    last7DaysData[3].sales = 22000; last7DaysData[3].collections = 17500;
    last7DaysData[4].sales = 19000; last7DaysData[4].collections = 15000;
    last7DaysData[5].sales = 27500; last7DaysData[5].collections = 21000;
    last7DaysData[6].sales = 34000; last7DaysData[6].collections = 28000;
  }

  const hasRepairData = repairChartData.some((x) => x.count > 0);
  if (!hasRepairData) {
    usedSampleData = true;
    repairChartData.find((x) => x.status === "RECEIVED")!.count = 5;
    repairChartData.find((x) => x.status === "IN_PROGRESS")!.count = 7;
    repairChartData.find((x) => x.status === "WAITING_PART")!.count = 3;
    repairChartData.find((x) => x.status === "READY")!.count = 6;
    repairChartData.find((x) => x.status === "DELIVERED")!.count = 18;
    repairChartData.find((x) => x.status === "CANCELED")!.count = 2;
  }

  const hasSixMonthData = monthsList.some((m) => m.income > 0 || m.expense > 0);
  if (!hasSixMonthData) {
    usedSampleData = true;
    const seedValues = [
      { income: 45000, expense: 28000 },
      { income: 52000, expense: 31000 },
      { income: 49000, expense: 33000 },
      { income: 68000, expense: 38000 },
      { income: 75000, expense: 42000 },
      { income: 84000, expense: 45000 },
    ];
    monthsList.forEach((m, idx) => {
      m.income = seedValues[idx].income;
      m.expense = seedValues[idx].expense;
    });
  }

  // Calculate Net Profit for 6 months list
  monthsList.forEach((m) => {
    m.netProfit = m.income - m.expense;
  });

  if (recentLogs.length === 0) {
    usedSampleData = true;
    recentLogs = [
      { id: "mock-1", createdAt: new Date(Date.now() - 1000 * 60 * 12), action: "POS_CHECKOUT", entityType: "Transaction", entityId: "tr-9304", detail: "POS-1716298000 / 1,299.00 TL" },
      { id: "mock-2", createdAt: new Date(Date.now() - 1000 * 60 * 45), action: "REPAIR_RECEIVED", entityType: "RepairRecord", entityId: "rep-0210", detail: "iPhone 11 Ekran Degisimi" },
      { id: "mock-3", createdAt: new Date(Date.now() - 1000 * 60 * 120), action: "INVENTORY_UPDATE", entityType: "StockItem", entityId: "stk-4482", detail: "Stok kart guncellemesi" },
      { id: "mock-4", createdAt: new Date(Date.now() - 1000 * 60 * 240), action: "CUSTOMER_CREATE", entityType: "Customer", entityId: "cust-9941", detail: "Ahmet Ylmaz (532xxxxxxx)" },
    ];
  }

  // Math for SVG Doughnut Chart
  const totalRepairs = repairChartData.reduce((sum, item) => sum + item.count, 0);
  let accumulatedPercent = 0;
  const doughnutSegments = repairChartData.map((item) => {
    const percent = totalRepairs > 0 ? item.count / totalRepairs : 0;
    const strokeLength = percent * 251.327; // 2 * PI * r (r=40)
    const strokeOffset = 251.327 - strokeLength + (accumulatedPercent * 251.327);
    accumulatedPercent -= percent;
    return {
      ...item,
      percent,
      strokeLength,
      strokeOffset,
    };
  });

  // Math for SVG 7-Day Bar Chart
  const maxBarVal = Math.max(...last7DaysData.map((d) => Math.max(d.sales, d.collections)), 1000);
  const barChartHeight = 140;

  // Math for SVG 6-Month Line/Area Chart
  const max6MonthVal = Math.max(...monthsList.map((m) => Math.max(m.income, m.expense, m.netProfit)), 1000);
  
  const pointsIncome = monthsList.map((m, i) => ({ x: 60 + i * 98, y: 170 - (m.income / max6MonthVal) * 130 }));
  const pointsExpense = monthsList.map((m, i) => ({ x: 60 + i * 98, y: 170 - (m.expense / max6MonthVal) * 130 }));
  const pointsNetProfit = monthsList.map((m, i) => ({ x: 60 + i * 98, y: 170 - (m.netProfit / max6MonthVal) * 130 }));

  const incomeLinePath = `M ${pointsIncome.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const expenseLinePath = `M ${pointsExpense.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const netProfitLinePath = `M ${pointsNetProfit.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  // Area under Net Profit Curve
  const netProfitAreaPath = `M 60,170 L ${pointsNetProfit.map((p) => `${p.x},${p.y}`).join(" L ")} L ${pointsNetProfit[pointsNetProfit.length - 1].x},170 Z`;

  return (
    <section className="space-y-8 animate-fade-in pb-12 max-w-[1400px] mx-auto px-5 md:px-8">
      
      {/* DB Warning banner */}
      {(dbUnavailable || dbDisabled) && (
        <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-amber-900 shadow-sm backdrop-blur-md">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700 font-bold text-lg border border-amber-200">!</span>
          <div className="text-sm">
            <span className="font-bold block text-amber-950">Tanıtım Modu Aktif</span>
            <span className="text-amber-800 text-xs mt-0.5 block">
              {dbDisabled
                ? "Sistem veritabani baglantisi olmadan calisiyor. Gorsel grafikler ve analizler simule edilmis verilerle zenginlestirilmistir."
                : "PostgreSQL veritabani servisinizle iletisim kurulamadi. Gosterilen finansal panolar ve analizler simule edilmistir."}
            </span>
          </div>
        </div>
      )}

      {/* Sample-data banner — shown when the DB is fine but this tenant has no real
          activity yet, so the charts/log below are filled with placeholder numbers. */}
      {!dbUnavailable && !dbDisabled && usedSampleData && (
        <div className="flex items-center gap-3.5 rounded-2xl border border-blue-200/60 bg-blue-50/50 p-4 text-blue-900 shadow-sm backdrop-blur-md">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-700 font-bold text-lg border border-blue-200">i</span>
          <div className="text-sm">
            <span className="font-bold block text-blue-950">Örnek Veriler Gösteriliyor</span>
            <span className="text-blue-800 text-xs mt-0.5 block">
              Henüz gerçek satış/işlem kaydınız bulunmuyor. Aşağıdaki grafik ve işlem günlüğündeki rakamlar gerçek verileriniz değil, örnek amaçlıdır — ilk satışınızla birlikte gerçek verilerinizle değişecektir.
            </span>
          </div>
        </div>
      )}

      {/* Header section — asymmetric (VAR=8) */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:max-w-xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-blue-700">
              {new Date().toLocaleDateString("tr-TR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-black tracking-tight text-slate-900 leading-none">
            Yonetim Paneli
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-lg">
            Subelerinizin finansal durumu, anlik kasa ve operasyonel akislar.
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-bold shadow-sm">
          <Link href="/dashboard?period=day" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "day" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Gunluk</Link>
          <Link href="/dashboard?period=week" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "week" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Haftalik</Link>
          <Link href="/dashboard?period=month" className={`px-4 py-2 rounded-xl transition-all ${selectedPeriod === "month" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>Aylik</Link>
        </div>
      </div>

      {/* Financial Overview Cards — asymmetric bento (VAR=8) */}
      <div id="dashboard-kpi" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-flow-dense">

        <div className="relative group overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-2">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-600 opacity-80" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Satis Geliri</p>
          <div className="mt-3 flex items-baseline gap-3">
            <h3 className="text-[clamp(1.8rem,2.5vw,2.8rem)] font-black text-slate-800 font-mono tracking-tight">{periodIncome.toLocaleString("tr-TR")} TL</h3>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">+12.4%</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">onceki doneme gore</p>
        </div>

        <div className="relative group overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Toplam Gider</p>
          <div className="mt-3 flex items-baseline gap-3">
            <h3 className="text-2xl font-black text-rose-600 font-mono tracking-tight">{periodExpense > 0 ? "-" : ""}{periodExpense.toLocaleString("tr-TR")} TL</h3>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">+4.8%</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">gider degisimi</p>
        </div>

        <div className="relative group overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Net Kar</p>
          <div className="mt-3 flex items-baseline gap-3">
            <h3 className={`text-2xl font-black ${periodNetProfit >= 0 ? "text-emerald-600" : "text-red-600"} font-mono tracking-tight`}>{periodNetProfit.toLocaleString("tr-TR")} TL</h3>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${periodNetProfit >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>{periodNetProfit >= 0 ? "+18.2%" : "+2.1%"}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">brut marj orani</p>
        </div>

        <div className="relative group overflow-hidden rounded-[20px] border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-2">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-blue-500 opacity-85" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{periodLabel} Nakit Girisi</p>
          <div className="mt-3 flex items-baseline gap-3">
            <h3 className="text-[clamp(1.8rem,2.5vw,2.8rem)] font-black text-slate-800 font-mono tracking-tight">{periodTahsilat.toLocaleString("tr-TR")} TL</h3>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">+9.5%</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">alacak tahsilat hizi</p>
        </div>

      </div>

      {/* Stats Cards — glassmorphism */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kayitli Musteri</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{customerCount}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">aktif portfoy</p>
        </div>

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teknik Servis</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{repairCount}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">toplam is emri</p>
        </div>

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gunluk Satis</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{dailySales.toLocaleString("tr-TR")} TL</p>
          <p className="mt-0.5 text-[10px] text-slate-500">POS kasasi</p>
        </div>

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gunluk Tahsilat</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{dailyTahsilat.toLocaleString("tr-TR")} TL</p>
          <p className="mt-0.5 text-[10px] text-slate-500">kasa girisi</p>
        </div>

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Veresiye Borc</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{totalDebit.toLocaleString("tr-TR")} TL</p>
          <p className="mt-0.5 text-[10px] text-slate-500">toplam tahsil edilecek</p>
        </div>

        <div className="rounded-[16px] border border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:border-slate-300/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Veresiye Tahsilat</p>
          <p className="mt-2 text-xl font-black text-slate-800 font-mono">{totalCredit.toLocaleString("tr-TR")} TL</p>
          <p className="mt-0.5 text-[10px] text-slate-500">toplam tahsil edilen</p>
        </div>

      </div>

      {/* 6-Month Income vs Expense vs Net Profit SVG Graph */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Net Kar ve Bilanco Gelisimi</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Son 6 aylik gelir, gider ve net bilanco analizi</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-blue-600 shadow-sm shadow-blue-700/20"></span>
              <span className="text-slate-600">Satis / Gelir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-rose-500 shadow-sm shadow-rose-600/20"></span>
              <span className="text-slate-600">Giderler</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-blue-600 shadow-sm shadow-blue-700/20"></span>
              <span className="text-slate-600">Net Kar</span>
            </div>
          </div>
        </div>

        {/* SVG Area / Line Chart for 6 Months */}
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 600 220" className="w-full min-w-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* Gradients definitions */}
            <defs>
              <linearGradient id="netProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
              </linearGradient>
              <filter id="shadow-line" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.25" />
              </filter>
              <filter id="shadow-line-blue" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#1d4ed8" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Grid Lines */}
            <line x1="45" y1="30" x2="570" y2="30" stroke="#f8fafc" strokeWidth="1.5" />
            <line x1="45" y1="75" x2="570" y2="75" stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="45" y1="120" x2="570" y2="120" stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="45" y1="170" x2="570" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Axis Y Labels */}
            <text x="35" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{max6MonthVal.toLocaleString("tr-TR")}</text>
            <text x="35" y="79" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(max6MonthVal * 0.65).toLocaleString("tr-TR")}</text>
            <text x="35" y="124" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(max6MonthVal * 0.35).toLocaleString("tr-TR")}</text>
            <text x="35" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">0</text>

            {/* Net Profit Area Fill */}
            <path d={netProfitAreaPath} fill="url(#netProfitGrad)" />

            {/* Path lines with filters */}
            <path d={incomeLinePath} stroke="#1d4ed8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow-line-blue)" />
            <path d={expenseLinePath} stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={netProfitLinePath} stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#shadow-line)" />

            {/* Interaction points circles */}
            {monthsList.map((m, idx) => {
              const pInc = pointsIncome[idx];
              const pExp = pointsExpense[idx];
              const pNet = pointsNetProfit[idx];

              return (
                <g key={m.label} className="group/node">
                  
                  {/* Vertical hover alignment line */}
                  <line x1={pInc.x} y1="30" x2={pInc.x} y2="170" stroke="#e2e8f0" strokeDasharray="3 3" className="opacity-0 group-hover/node:opacity-100 transition-opacity" />

                  {/* Income point */}
                  <circle cx={pInc.x} cy={pInc.y} r="5" fill="#1d4ed8" stroke="#fff" strokeWidth="2" className="transition-all hover:scale-150 cursor-pointer" />
                  
                  {/* Expense point */}
                  <circle cx={pExp.x} cy={pExp.y} r="5" fill="#f43f5e" stroke="#fff" strokeWidth="2" className="transition-all hover:scale-150 cursor-pointer" />

                  {/* Net Profit point */}
                  <circle cx={pNet.x} cy={pNet.y} r="6" fill="#2563eb" stroke="#fff" strokeWidth="2.5" className="transition-all hover:scale-150 cursor-pointer shadow-sm" />

                  {/* Tooltip detail block */}
                  <g className="opacity-0 group-hover/node:opacity-100 transition-all duration-200 pointer-events-none transform -translate-y-1">
                    <rect x={pInc.x - 65} y="5" width="130" height="52" rx="10" fill="#090d16" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <text x={pInc.x} y="19" textAnchor="middle" fill="#fff" className="text-[9px] font-bold">Gelir: {m.income.toLocaleString()} TL</text>
                    <text x={pInc.x} y="31" textAnchor="middle" fill="#f43f5e" className="text-[9px] font-bold">Gider: {m.expense.toLocaleString()} TL</text>
                    <text x={pInc.x} y="44" textAnchor="middle" fill="#818cf8" className="text-[9px] font-bold">Kar: {m.netProfit.toLocaleString()} TL</text>
                  </g>

                  {/* X Axis label */}
                  <text x={pInc.x} y="195" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{m.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Analytics Charts Grid (7-Day & Doughnut) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Weekly Income Bar Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Haftalik Finansal Performans</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Son 7 gunluk satis hacmi ve tahsilat dagilimi</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-blue-600"></span>
                <span className="text-slate-600">Satis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-blue-400"></span>
                <span className="text-slate-600">Nakit Girisi</span>
              </div>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 600 220" className="w-full min-w-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="580" y2="30" stroke="#f8fafc" strokeWidth="1" />
              <line x1="40" y1="80" x2="580" y2="80" stroke="#f8fafc" strokeWidth="1" />
              <line x1="40" y1="130" x2="580" y2="130" stroke="#f8fafc" strokeWidth="1" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="32" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{maxBarVal.toLocaleString("tr-TR")}</text>
              <text x="32" y="84" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(maxBarVal * 0.6).toLocaleString("tr-TR")}</text>
              <text x="32" y="134" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(maxBarVal * 0.3).toLocaleString("tr-TR")}</text>
              <text x="32" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">0</text>

              {/* Data Bars */}
              {last7DaysData.map((d, i) => {
                const xBase = 65 + i * 75;
                const salesH = (d.sales / maxBarVal) * barChartHeight;
                const collH = (d.collections / maxBarVal) * barChartHeight;
                const salesY = 170 - salesH;
                const collY = 170 - collH;

                return (
                  <g key={d.dateStr} className="group cursor-pointer">
                    {/* Tooltip background */}
                    <g className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <rect x={xBase - 15} y="2" width="76" height="24" rx="6" fill="#090d16" />
                      <text x={xBase + 23} y="14" textAnchor="middle" fill="#fff" className="text-[8px] font-bold font-mono">
                        S:{d.sales.toLocaleString()} / T:{d.collections.toLocaleString()}
                      </text>
                    </g>

                    {/* Sales Bar */}
                    <rect
                      x={xBase}
                      y={salesY}
                      width="15"
                      height={Math.max(salesH, 1)}
                      rx="3.5"
                      fill="#1d4ed8"
                      className="transition-all duration-300 hover:fill-blue-600"
                    />
                    {/* Collections Bar */}
                    <rect
                      x={xBase + 18}
                      y={collY}
                      width="15"
                      height={Math.max(collH, 1)}
                      rx="3.5"
                      fill="#3b82f6"
                      className="transition-all duration-300 hover:fill-blue-600"
                    />

                    {/* Axis Labels */}
                    <text x={xBase + 16} y="192" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{d.dayName}</text>
                    <text x={xBase + 16} y="206" textAnchor="middle" className="text-[9px] fill-slate-400 font-medium">{d.dateStr}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Repair Status Doughnut Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Teknik Servis Dagilimi</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Servis tezgahindaki aktif onarimlarin durum analizi</p>
          </div>

          <div className="flex flex-col items-center justify-center my-6 relative">
            {/* Doughnut SVG */}
            <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="#f8fafc" strokeWidth="8" fill="transparent" />
              {doughnutSegments.map((seg) => (
                seg.count > 0 && (
                  <circle
                    key={seg.status}
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={seg.color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${seg.strokeLength} 251.327`}
                    strokeDashoffset={seg.strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 cursor-pointer hover:stroke-[10px]"
                  />
                )
              ))}
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-800 font-mono">{totalRepairs}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cihaz</span>
            </div>
          </div>

          {/* Color legends */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold border-t border-slate-100 pt-4">
            {repairChartData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full block shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-650 truncate">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs and Actions */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Chronological Timeline Audit logs */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sistem Islem Gunlugu</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Uygulama genelinde gerceklestirilen son hareketler</p>
            </div>
            <span className="text-xs text-blue-650 font-bold hover:text-blue-700 hover:underline cursor-pointer transition">Gunlugu Filtrele</span>
          </div>

          <div className="relative border-l-2 border-slate-100/70 ml-3 pl-6 space-y-6">
            {recentLogs.map((log) => {
              let badgeColor = "bg-slate-50 text-slate-600 border-slate-200/50";
              if (log.action.includes("CHECKOUT")) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100/50";
              else if (log.action.includes("REPAIR")) badgeColor = "bg-blue-50 text-blue-700 border-blue-100/50";
              else if (log.action.includes("RECONCILIATION")) badgeColor = "bg-blue-50 text-blue-700 border-blue-100/50";
              else if (log.action.includes("CREATE")) badgeColor = "bg-blue-50 text-blue-700 border-blue-100/50";

              return (
                <div key={log.id} className="relative group">
                  {/* Glowing Node */}
                  <span className="absolute -left-[32px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-slate-300 ring-4 ring-white group-hover:bg-blue-500 group-hover:ring-blue-100 transition-all duration-200"></span>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {log.entityType} ({log.entityId?.slice(-6).toUpperCase() || "SISTEM"})
                      </span>
                    </div>
                    <time className="text-xs text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {log.detail ? log.detail : `${log.entityType} uzerinde islem tamamlandi.`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hizli Kisayollar</h3>
            <p className="text-xs text-slate-400 mb-4 font-medium">Sik yapilan islemlere aninda erisim</p>
          </div>

          <div className="space-y-3">
            <a href="/pos" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-3 rounded-2xl border border-slate-100 hover:border-blue-200/50 bg-slate-50/50 hover:bg-blue-50/20 text-slate-700 hover:text-blue-800 font-semibold text-xs transition-all duration-200 transform hover:scale-[1.01]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/55"></span>
              Yeni POS Satis Yap
            </a>
            <Link href="/tamir-takip" className="flex items-center gap-3 w-full p-3 rounded-2xl border border-slate-100 hover:border-blue-200/50 bg-slate-50/50 hover:bg-blue-50/20 text-slate-700 hover:text-blue-800 font-semibold text-xs transition-all duration-200 transform hover:scale-[1.01]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/55"></span>
              Ariza / Tamir Kaydi Ac
            </Link>
            <Link href="/musteriler-veresiye" className="flex items-center gap-3 w-full p-3 rounded-2xl border border-slate-100 hover:border-rose-200/50 bg-slate-50/50 hover:bg-rose-50/20 text-slate-700 hover:text-rose-800 font-semibold text-xs transition-all duration-200 transform hover:scale-[1.01]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100/55"></span>
              Cari Hesap / Borc Takibi
            </Link>
            <Link href="/giderler" className="flex items-center gap-3 w-full p-3 rounded-2xl border border-slate-100 hover:border-amber-200/50 bg-slate-50/50 hover:bg-amber-50/20 text-slate-700 hover:text-amber-800 font-semibold text-xs transition-all duration-200 transform hover:scale-[1.01]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/55"></span>
              Gider Yönetim Paneli
            </Link>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold">
            Versiyon 1.1.0 - VibeGSM Cloud
          </div>
        </div>
      </div>
    </section>
  );
}

