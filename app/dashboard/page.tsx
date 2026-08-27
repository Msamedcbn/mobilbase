export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import { getSessionUser, getEffectiveTenantId } from "@/lib/auth";
import Link from "next/link";
import { DashboardClock } from "@/components/dashboard-clock";
import { MobileQuickGrid } from "@/components/mobile-quick-grid";

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

  // Live weather widget (Istanbul by default — no per-tenant address to geocode
  // yet). Open-Meteo needs no API key; fetch failures are swallowed so a flaky
  // network never breaks the dashboard, the widget just doesn't render.
  const WEATHER_CODE_LABELS: Record<number, string> = {
    0: "Açık", 1: "Az Bulutlu", 2: "Parçalı Bulutlu", 3: "Kapalı",
    45: "Sisli", 48: "Kırağı Sisi",
    51: "Hafif Çisenti", 53: "Çisenti", 55: "Yoğun Çisenti",
    61: "Hafif Yağmurlu", 63: "Yağmurlu", 65: "Şiddetli Yağmurlu",
    71: "Hafif Kar Yağışlı", 73: "Kar Yağışlı", 75: "Yoğun Kar Yağışlı",
    80: "Sağanak", 81: "Kuvvetli Sağanak", 82: "Şiddetli Sağanak",
    95: "Gök Gürültülü Fırtına", 96: "Dolulu Fırtına", 99: "Şiddetli Dolulu Fırtına",
  };
  let weather: { tempC: number; feelsLikeC: number; humidity: number; windKph: number; label: string } | null = null;
  try {
    const weatherRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.0082&longitude=28.9784&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto",
      { cache: "no-store" }
    );
    if (weatherRes.ok) {
      const weatherJson = await weatherRes.json();
      const c = weatherJson?.current;
      if (c && typeof c.temperature_2m === "number") {
        weather = {
          tempC: Math.round(c.temperature_2m),
          feelsLikeC: Math.round(c.apparent_temperature),
          humidity: Math.round(c.relative_humidity_2m),
          windKph: Math.round(c.wind_speed_10m),
          label: WEATHER_CODE_LABELS[c.weather_code] || "—",
        };
      }
    }
  } catch {
    weather = null;
  }

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

  // Previous-period equivalents, used to compute real period-over-period deltas
  // for the KPI badges (they used to be hardcoded placeholder percentages).
  let periodIncomePrev = 0;
  let periodExpensePrev = 0;
  let periodTahsilatPrev = 0;

  const periodStart = selectedPeriod === "day" ? startOfDay : selectedPeriod === "week" ? startOfWeek : startOfMonth;
  const previousPeriodStart = new Date(periodStart);
  if (selectedPeriod === "day") previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
  else if (selectedPeriod === "week") previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
  else previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
  const previousPeriodEnd = periodStart;

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

  // Product-mix donut ("Ürün Dağılımı") — a categorical breakdown, not a
  // status/severity one, so it deliberately uses a distinct multi-hue palette
  // rather than the semantic blue/emerald/amber/rose set used everywhere else.
  const categoryPalette = ["#7c3aed", "#db2777", "#0d9488", "#f59e0b", "#4f46e5", "#64748b", "#0ea5e9", "#65a30d"];
  let productCategoryDist: Array<{ category: string; count: number; color: string }> = [];

  try {
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

      // Product-mix breakdown for the "Ürün Dağılımı" donut
      const tenantStockItems = (store.stockItems || []).filter((p) => p.tenantId === tenantId);
      const categoryCounts = new Map<string, number>();
      tenantStockItems.forEach((p) => {
        const key = p.category || "Diğer";
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
      });
      productCategoryDist = [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, count], i) => ({ category, count, color: categoryPalette[i % categoryPalette.length] }));

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

      periodIncomePrev = txs
        .filter((t) => t.type === "INCOME" && new Date(t.createdAt) >= previousPeriodStart && new Date(t.createdAt) < previousPeriodEnd)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);
      periodExpensePrev = txs
        .filter((t) => t.type === "EXPENSE" && new Date(t.createdAt) >= previousPeriodStart && new Date(t.createdAt) < previousPeriodEnd)
        .reduce((sum, t) => sum + Number(t.totalAmount), 0);
      periodTahsilatPrev = aes
        .filter((ae) => ae.type === "CREDIT" && new Date(ae.createdAt) >= previousPeriodStart && new Date(ae.createdAt) < previousPeriodEnd)
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
        previousPeriodIncomeAgg,
        previousPeriodExpenseAgg,
        previousPeriodTahsilatAgg,
        productCategoryGroups,
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
        prisma.transaction.aggregate({
          where: { tenantId, type: "INCOME", createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { tenantId, type: "EXPENSE", createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } },
          _sum: { totalAmount: true },
        }),
        prisma.accountEntry.aggregate({
          where: { customer: { tenantId }, type: "CREDIT", createdAt: { gte: previousPeriodStart, lt: previousPeriodEnd } },
          _sum: { amount: true },
        }),
        prisma.product.groupBy({
          by: ["category"],
          where: { tenantId, isActive: true },
          _count: { id: true },
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
      periodIncomePrev = Number(previousPeriodIncomeAgg._sum.totalAmount ?? 0);
      periodExpensePrev = Number(previousPeriodExpenseAgg._sum.totalAmount ?? 0);
      periodTahsilatPrev = Number(previousPeriodTahsilatAgg._sum.amount ?? 0);

      productCategoryDist = productCategoryGroups
        .map((g) => ({ category: g.category || "Diğer", count: g._count.id }))
        .sort((a, b) => b.count - a.count)
        .map((g, i) => ({ ...g, color: categoryPalette[i % categoryPalette.length] }));

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
  const periodNetProfitPrev = periodIncomePrev - periodExpensePrev;
  const periodLabel = selectedPeriod === "day" ? "Gunluk" : selectedPeriod === "week" ? "Haftalik" : "Aylik";
  const collectionRate = periodIncome > 0 ? (periodTahsilat / periodIncome) * 100 : 0;
  const veresiyeRiskRate = totalDebit > 0 ? (veresiyeBalance / totalDebit) * 100 : 0;

  // Real period-over-period deltas for the KPI badges. `null` means "no prior
  // baseline to compare against" (previous period was zero) — rendered as a
  // neutral "Yeni" chip instead of a nonsensical +Infinity%.
  const pctChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return curr === 0 ? 0 : null;
    return ((curr - prev) / prev) * 100;
  };
  const nowHour = new Date().getHours();
  const greeting = nowHour < 6 ? "İyi geceler" : nowHour < 12 ? "Günaydın" : nowHour < 18 ? "İyi günler" : "İyi akşamlar";
  const firstName = sessionUser?.fullName?.split(" ")[0] || "";
  const trialDaysLeft = sessionUser?.isTrial && sessionUser.trialExpiresAt
    ? Math.max(0, Math.ceil((new Date(sessionUser.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const incomeChangePct = pctChange(periodIncome, periodIncomePrev);
  const expenseChangePct = pctChange(periodExpense, periodExpensePrev);
  const netProfitChangePct = pctChange(periodNetProfit, periodNetProfitPrev);
  const tahsilatChangePct = pctChange(periodTahsilat, periodTahsilatPrev);

  // `invert`: for expense, a rise (isUp) is bad, not good — flips the color logic.
  function DeltaBadge({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
    if (pct === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
          Yeni
        </span>
      );
    }
    const isUp = pct >= 0;
    const isGood = invert ? !isUp : isUp;
    const colorClasses = isGood
      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
      : "bg-rose-50 text-rose-600 border-rose-100";
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${colorClasses}`}>
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          {isUp ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.306a11.95 11.95 0 015.814 5.518l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
          )}
        </svg>
        {isUp ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    );
  }

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

  if (productCategoryDist.length === 0) {
    usedSampleData = true;
    productCategoryDist = [
      { category: "Telefon", count: 24, color: categoryPalette[0] },
      { category: "Aksesuar", count: 15, color: categoryPalette[1] },
      { category: "Yedek Parça", count: 9, color: categoryPalette[2] },
      { category: "Diğer", count: 4, color: categoryPalette[3] },
    ];
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

  // Math for SVG Doughnut Charts — shared by both the repair-status and the
  // product-mix donut below.
  function buildDoughnutSegments<T extends { count: number }>(items: T[]) {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    let accumulatedPercent = 0;
    return items.map((item) => {
      const percent = total > 0 ? item.count / total : 0;
      const strokeLength = percent * 251.327; // 2 * PI * r (r=40)
      const strokeOffset = 251.327 - strokeLength + accumulatedPercent * 251.327;
      accumulatedPercent -= percent;
      return { ...item, percent, strokeLength, strokeOffset };
    });
  }

  const totalProducts = productCategoryDist.reduce((sum, item) => sum + item.count, 0);
  const productDoughnutSegments = buildDoughnutSegments(productCategoryDist);

  // Math for SVG 7-Day gradient area chart ("Haftalik Gelir Gostergesi")
  const maxBarVal = Math.max(...last7DaysData.map((d) => Math.max(d.sales, d.collections)), 1000);
  const barChartHeight = 140;
  const pointsSales7 = last7DaysData.map((d, i) => ({ x: 65 + i * 75 + 16, y: 170 - (d.sales / maxBarVal) * barChartHeight }));
  const pointsCollections7 = last7DaysData.map((d, i) => ({ x: 65 + i * 75 + 16, y: 170 - (d.collections / maxBarVal) * barChartHeight }));
  const salesLinePath7 = `M ${pointsSales7.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const collectionsLinePath7 = `M ${pointsCollections7.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const salesAreaPath7 = `M 65,170 L ${pointsSales7.map((p) => `${p.x},${p.y}`).join(" L ")} L ${pointsSales7[pointsSales7.length - 1].x},170 Z`;

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

  // Actionable work items, derived from real data (open receivables, repair
  // queue) — drives both the notification badge and the "Yapilacaklar" card.
  const waitingPartCount = repairChartData.find((r) => r.status === "WAITING_PART")?.count ?? 0;
  const readyForPickupCount = repairChartData.find((r) => r.status === "READY")?.count ?? 0;
  const attentionAlerts = [
    veresiyeBalance > 0 && {
      hex: "#f59e0b",
      text: `Acik veresiye bakiyesi: ${veresiyeBalance.toLocaleString("tr-TR")} TL`,
      href: "/musteriler-veresiye",
    },
    waitingPartCount > 0 && {
      hex: "#f43f5e",
      text: `${waitingPartCount} cihaz parca bekliyor`,
      href: "/tamir-takip",
    },
    readyForPickupCount > 0 && {
      hex: "#3b82f6",
      text: `${readyForPickupCount} cihaz teslime hazir`,
      href: "/tamir-takip",
    },
  ].filter(Boolean) as Array<{ hex: string; text: string; href: string }>;
  const alertCount = attentionAlerts.length;

  // Every card carries a "last refreshed" stamp, like the reference dashboard.
  const updatedLabel = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function CardHead({ title, sub }: { title: string; sub?: string }) {
    return (
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">{title}</h3>
          {sub ? <p className="mt-0.5 text-[11px] font-medium text-slate-400">{sub}</p> : null}
        </div>
        <svg className="w-3.5 h-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </div>
    );
  }

  function CardFoot() {
    return <p className="mt-3 text-[9px] font-semibold text-slate-300">Guncelleme: {updatedLabel}</p>;
  }

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

      {/* ── TOPBAR: greeting + name | plan badges | subscription status card ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">{greeting}</p>
            <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
              {firstName || "Kullanici"}
            </h2>
          </div>
          <span className="rounded-md bg-slate-900 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            {trialDaysLeft !== null ? "Deneme" : "Business"}
          </span>
          <div className="flex items-center gap-2">
            <Link href="/uyarilar" className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition" title="Uyarilar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {alertCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white font-mono">
                  {alertCount}
                </span>
              )}
            </Link>
            <Link href="/ayarlar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition" title="Ayarlar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>

        <Link
          href="/ayarlar/abonelik"
          className="flex items-center gap-3 rounded-xl bg-[#1c1c1e] px-4 py-3 text-white shadow-sm transition hover:bg-[#26262a] lg:min-w-[380px]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-tight">VibeGSM {trialDaysLeft !== null ? "Deneme" : "Business"}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              {trialDaysLeft !== null
                ? <>Deneme sureniz devam ediyor (<span className="font-mono">{trialDaysLeft}</span> gun).</>
                : "Aboneliginize devam ediyorsunuz."}
            </p>
          </div>
          <svg className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>

      {/* ── SEARCH BAR (full width) ── */}
      <form action="/stok" className="relative">
        <input type="hidden" name="tab" value="inventory" />
        <input
          type="text"
          name="q"
          placeholder="IMEI, Barkod veya Urun Ara..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm font-medium text-slate-700 placeholder-slate-400 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
        <svg className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600" aria-label="Ara">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </form>

      {/* ── MOBILE: app-launcher tile grid (desktop uses the sidebar instead) ── */}
      <MobileQuickGrid />

      {/* ── MAIN GRID: left column (clock/weather, ozet, dagilim, islemler) +
             right column (KPI, haftalik grafik, yapilacaklar, kisayollar) ── */}
      <div className="grid gap-4 lg:grid-cols-12">

        {/* ═══ LEFT COLUMN ═══ */}
        <div className="lg:col-span-7 min-w-0 space-y-4">

          {/* Clock (dark) + Weather */}
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardClock />

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {weather ? (
                <div className="flex h-full items-center gap-4">
                  <div className="shrink-0">
                    <svg className="w-9 h-9 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 5a4 4 0 110 8 4 4 0 010-8zm8 4a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM6 12a1 1 0 01-1 1H4a1 1 0 110-2h1a1 1 0 011 1zm11.657-6.657a1 1 0 010 1.414l-.708.708a1 1 0 11-1.414-1.414l.708-.708a1 1 0 011.414 0zM7.05 17.657a1 1 0 010 1.414l-.707.707a1 1 0 11-1.415-1.414l.708-.708a1 1 0 011.414.001zm10.607.707a1 1 0 01-1.414 0l-.708-.708a1 1 0 011.414-1.414l.708.708a1 1 0 010 1.414zM6.343 6.343a1 1 0 01-1.414 0l-.708-.708a1 1 0 011.415-1.414l.707.707a1 1 0 010 1.415zM12 19a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
                    </svg>
                    <p className="mt-1 text-3xl font-black text-slate-900 font-mono leading-none">{weather.tempC}&deg;</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">{weather.label}</p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 border-l border-slate-100 pl-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5V7.5a3 3 0 10-6 0v6a5.25 5.25 0 106 0z" /></svg>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400 leading-none">Hissedilen</p>
                        <p className="text-[11px] font-bold text-slate-700 font-mono">{weather.feelsLikeC}&deg;</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 shrink-0 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l4.5 6a5.5 5.5 0 11-9 0l4.5-6z" /></svg>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400 leading-none">Nem</p>
                        <p className="text-[11px] font-bold text-slate-700 font-mono">%{weather.humidity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h11.25a2.25 2.25 0 100-4.5M3.75 15h8.25a2.25 2.25 0 110 4.5M3.75 12h15a2.25 2.25 0 100-4.5" /></svg>
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400 leading-none">Ruzgar</p>
                        <p className="text-[11px] font-bold text-slate-700 font-mono">{weather.windKph} km/s</p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 self-start text-right">
                    <p className="text-sm font-black text-slate-900">Istanbul</p>
                    <p className="text-[9px] text-slate-400 font-medium">Turkiye</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Hava durumu alinamadi</div>
              )}
            </div>
          </div>

          {/* Bugunun Ozeti */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Bugunun Ozeti" />
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Cihaz Satis", value: `${dailySales.toLocaleString("tr-TR")} TL`, wrap: "bg-blue-50 text-blue-600", path: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" },
                { label: "Tahsilat", value: `${dailyTahsilat.toLocaleString("tr-TR")} TL`, wrap: "bg-emerald-50 text-emerald-600", path: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-4.5-9.75h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5z" },
                { label: "Acik Servis", value: `${repairCount}`, wrap: "bg-amber-50 text-amber-600", path: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.276a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" },
              ].map((m, i) => (
                <div key={m.label} className={`min-w-0 ${i === 0 ? "pr-3" : i === 2 ? "pl-3" : "px-3"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.wrap}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.path} />
                    </svg>
                  </span>
                  <p className="mt-2.5 text-lg font-black text-slate-900 font-mono leading-none truncate">{m.value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
            <CardFoot />
          </div>

          {/* Urun Dagilimi — donut left, legend right */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Urun Dagilimi" />
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <svg width="132" height="132" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="transparent" />
                  {productDoughnutSegments.map((seg) => (
                    seg.count > 0 && (
                      <circle
                        key={seg.category}
                        cx="50"
                        cy="50"
                        r="40"
                        stroke={seg.color}
                        strokeWidth="9"
                        fill="transparent"
                        strokeDasharray={`${seg.strokeLength} 251.327`}
                        strokeDashoffset={seg.strokeOffset}
                        className="transition-all duration-500"
                      />
                    )
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-900 font-mono leading-none">{totalProducts}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Urun</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {productCategoryDist.map((item) => (
                  <div key={item.category} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-700 leading-tight">{item.category}</p>
                      <p className="text-[9px] font-medium text-slate-400 font-mono">{item.count} Adet</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-black text-slate-700 font-mono">
                      %{totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <CardFoot />
          </div>

          {/* Son Islemler */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Son Islemler" />
            <div className="max-h-[260px] space-y-0.5 overflow-y-auto panel-scroll">
              {recentLogs.map((log) => {
                let iconWrap = "bg-slate-100 text-slate-500";
                let iconPath = "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z";
                if (log.action.includes("CHECKOUT")) {
                  iconWrap = "bg-emerald-50 text-emerald-600";
                  iconPath = "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 14.25a2.25 2.25 0 002.25 1.5h9.157c1.052 0 1.945-.75 2.157-1.775l1.5-7.5A1.125 1.125 0 0020.625 4.5H5.106M6.75 14.25L5.106 4.5M6.75 14.25L5.25 18h13.5M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z";
                } else if (log.action.includes("REPAIR")) {
                  iconWrap = "bg-blue-50 text-blue-600";
                  iconPath = "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.276a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085";
                } else if (log.action.includes("RECONCILIATION")) {
                  iconWrap = "bg-indigo-50 text-indigo-600";
                  iconPath = "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99";
                } else if (log.action.includes("CREATE")) {
                  iconWrap = "bg-amber-50 text-amber-600";
                  iconPath = "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z";
                }

                return (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg px-1 py-2 transition hover:bg-slate-50">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconWrap}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-slate-800 leading-tight">
                        {log.detail ? log.detail : `${log.entityType} uzerinde islem tamamlandi.`}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                        {log.action.replace(/_/g, " ")} &middot; {log.entityId?.slice(-6).toUpperCase() || "SISTEM"}
                      </p>
                    </div>
                    <time className="shrink-0 text-[9px] font-medium text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                );
              })}
            </div>
            <CardFoot />
          </div>

          {/* Cari Durum */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Cari Durum" />
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              {[
                { label: "Kayitli Musteri", value: customerCount.toLocaleString("tr-TR"), wrap: "bg-slate-100 text-slate-500", path: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
                { label: "Veresiye Borc", value: `${totalDebit.toLocaleString("tr-TR")} TL`, wrap: "bg-amber-50 text-amber-600", path: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Veresiye Tahsilat", value: `${totalCredit.toLocaleString("tr-TR")} TL`, wrap: "bg-emerald-50 text-emerald-600", path: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
              ].map((m, i) => (
                <div key={m.label} className={`min-w-0 ${i === 0 ? "pr-3" : i === 2 ? "pl-3" : "px-3"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.wrap}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.path} />
                    </svg>
                  </span>
                  <p className="mt-2.5 truncate text-lg font-black leading-none text-slate-900 font-mono">{m.value}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
            <CardFoot />
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="lg:col-span-5 min-w-0 space-y-4">

          {/* KPI ozet — 2x2 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{periodLabel} Finansal Ozet</h3>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                <Link scroll={false} href="/dashboard?period=day" className={`rounded-md px-2 py-1 transition ${selectedPeriod === "day" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Gun</Link>
                <Link scroll={false} href="/dashboard?period=week" className={`rounded-md px-2 py-1 transition ${selectedPeriod === "week" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Hafta</Link>
                <Link scroll={false} href="/dashboard?period=month" className={`rounded-md px-2 py-1 transition ${selectedPeriod === "month" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Ay</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50/70 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Satis Geliri</p>
                <p className="mt-1.5 truncate text-base font-black text-slate-900 font-mono leading-none">{periodIncome.toLocaleString("tr-TR")} TL</p>
                <div className="mt-2"><DeltaBadge pct={incomeChangePct} /></div>
              </div>
              <div className="rounded-lg bg-slate-50/70 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Toplam Gider</p>
                <p className="mt-1.5 truncate text-base font-black text-rose-600 font-mono leading-none">{periodExpense.toLocaleString("tr-TR")} TL</p>
                <div className="mt-2"><DeltaBadge pct={expenseChangePct} invert /></div>
              </div>
              <div className="rounded-lg bg-slate-50/70 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net Kar</p>
                <p className={`mt-1.5 truncate text-base font-black font-mono leading-none ${periodNetProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{periodNetProfit.toLocaleString("tr-TR")} TL</p>
                <div className="mt-2"><DeltaBadge pct={netProfitChangePct} /></div>
              </div>
              <div className="rounded-lg bg-slate-50/70 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nakit Girisi</p>
                <p className="mt-1.5 truncate text-base font-black text-slate-900 font-mono leading-none">{periodTahsilat.toLocaleString("tr-TR")} TL</p>
                <div className="mt-2"><DeltaBadge pct={tahsilatChangePct} /></div>
              </div>
            </div>
            <CardFoot />
          </div>

          {/* Haftalik Gelir Gostergesi */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Haftalik Gelir Gostergesi</h3>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" /><span className="text-slate-500">Satis</span></span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-300" /><span className="text-slate-500">Tahsilat</span></span>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 600 220" className="w-full min-w-[440px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
                  </linearGradient>
                </defs>
                <line x1="40" y1="30" x2="580" y2="30" stroke="#f8fafc" strokeWidth="1" />
                <line x1="40" y1="80" x2="580" y2="80" stroke="#f8fafc" strokeWidth="1" />
                <line x1="40" y1="130" x2="580" y2="130" stroke="#f8fafc" strokeWidth="1" />
                <line x1="40" y1="170" x2="580" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />
                <text x="32" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{maxBarVal.toLocaleString("tr-TR")}</text>
                <text x="32" y="84" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(maxBarVal * 0.6).toLocaleString("tr-TR")}</text>
                <text x="32" y="134" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(maxBarVal * 0.3).toLocaleString("tr-TR")}</text>
                <text x="32" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">0</text>
                <path d={salesAreaPath7} fill="url(#salesAreaGrad)" />
                <path d={salesLinePath7} stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d={collectionsLinePath7} stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {last7DaysData.map((d, i) => {
                  const pSales = pointsSales7[i];
                  const pColl = pointsCollections7[i];
                  return (
                    <g key={d.dateStr} className="group cursor-pointer">
                      <line x1={pSales.x} y1="30" x2={pSales.x} y2="170" stroke="#e2e8f0" strokeDasharray="3 3" className="opacity-0 transition-opacity group-hover:opacity-100" />
                      <circle cx={pSales.x} cy={pSales.y} r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                      <circle cx={pColl.x} cy={pColl.y} r="4" fill="#93c5fd" stroke="#fff" strokeWidth="2" />
                      <g className="pointer-events-none opacity-0 transition-all duration-200 group-hover:opacity-100">
                        <rect x={pSales.x - 38} y="2" width="76" height="26" rx="6" fill="#1c1c1e" />
                        <text x={pSales.x} y="14" textAnchor="middle" fill="#fff" className="text-[8px] font-bold font-mono">S:{d.sales.toLocaleString()}</text>
                        <text x={pSales.x} y="24" textAnchor="middle" fill="#93c5fd" className="text-[8px] font-bold font-mono">T:{d.collections.toLocaleString()}</text>
                      </g>
                      <text x={pSales.x} y="192" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{d.dayName.slice(0, 3)}</text>
                      <text x={pSales.x} y="205" textAnchor="middle" className="text-[9px] fill-slate-400 font-medium">{d.dateStr}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <CardFoot />
          </div>

          {/* Yapilacaklar / Dikkat Gerekenler */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Yapilacaklar" />
            {attentionAlerts.length > 0 ? (
              <div className="space-y-2">
                {attentionAlerts.map((a) => (
                  <Link
                    key={a.text}
                    href={a.href}
                    className="flex items-center gap-3 rounded-lg border-l-[3px] bg-slate-50/60 py-2.5 pl-3 pr-3 transition hover:bg-slate-100"
                    style={{ borderLeftColor: a.hex }}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-700">{a.text}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-[11px] font-medium text-slate-400">Bekleyen is kalemi yok.</p>
            )}
            <CardFoot />
          </div>

          {/* Hizli Kisayollar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <CardHead title="Hizli Kisayollar" />
            <div className="grid grid-cols-2 gap-2">
              <a href="/pos" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 rounded-lg bg-slate-50/70 p-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 14.25a2.25 2.25 0 002.25 1.5h9.157c1.052 0 1.945-.75 2.157-1.775l1.5-7.5A1.125 1.125 0 0020.625 4.5H5.106M6.75 14.25L5.106 4.5M6.75 14.25L5.25 18h13.5M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                </span>
                <span className="truncate">POS Satis</span>
              </a>
              <Link href="/tamir-takip" className="group flex items-center gap-2.5 rounded-lg bg-slate-50/70 p-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.276a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" /></svg>
                </span>
                <span className="truncate">Tamir Kaydi</span>
              </Link>
              <Link href="/musteriler-veresiye" className="group flex items-center gap-2.5 rounded-lg bg-slate-50/70 p-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-4.5-9.75h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-9a1.5 1.5 0 011.5-1.5z" /></svg>
                </span>
                <span className="truncate">Cari Hesap</span>
              </Link>
              <Link href="/giderler" className="group flex items-center gap-2.5 rounded-lg bg-slate-50/70 p-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.306a11.95 11.95 0 015.814 5.518l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" /></svg>
                </span>
                <span className="truncate">Giderler</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Net Kar ve Bilanco Gelisimi (tam genislik) ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Net Kar ve Bilanco Gelisimi</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Son 6 aylik gelir, gider ve net bilanco analizi</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-700" /><span className="text-slate-500">Gelir</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /><span className="text-slate-500">Gider</span></span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-slate-500">Net Kar</span></span>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 600 220" className="w-full min-w-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="netProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
              </linearGradient>
            </defs>
            <line x1="45" y1="30" x2="570" y2="30" stroke="#f8fafc" strokeWidth="1.5" />
            <line x1="45" y1="75" x2="570" y2="75" stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="45" y1="120" x2="570" y2="120" stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="45" y1="170" x2="570" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="35" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{max6MonthVal.toLocaleString("tr-TR")}</text>
            <text x="35" y="79" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(max6MonthVal * 0.65).toLocaleString("tr-TR")}</text>
            <text x="35" y="124" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">{(max6MonthVal * 0.35).toLocaleString("tr-TR")}</text>
            <text x="35" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-bold font-mono">0</text>
            <path d={netProfitAreaPath} fill="url(#netProfitGrad)" />
            <path d={incomeLinePath} stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={expenseLinePath} stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={netProfitLinePath} stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {monthsList.map((m, idx) => {
              const pInc = pointsIncome[idx];
              const pExp = pointsExpense[idx];
              const pNet = pointsNetProfit[idx];
              return (
                <g key={m.label} className="group/node">
                  <line x1={pInc.x} y1="30" x2={pInc.x} y2="170" stroke="#e2e8f0" strokeDasharray="3 3" className="opacity-0 transition-opacity group-hover/node:opacity-100" />
                  <circle cx={pInc.x} cy={pInc.y} r="4.5" fill="#1d4ed8" stroke="#fff" strokeWidth="2" />
                  <circle cx={pExp.x} cy={pExp.y} r="4.5" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
                  <circle cx={pNet.x} cy={pNet.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
                  <g className="pointer-events-none opacity-0 transition-all duration-200 group-hover/node:opacity-100">
                    <rect x={pInc.x - 65} y="5" width="130" height="52" rx="8" fill="#1c1c1e" />
                    <text x={pInc.x} y="21" textAnchor="middle" fill="#fff" className="text-[9px] font-bold font-mono">Gelir: {m.income.toLocaleString()}</text>
                    <text x={pInc.x} y="34" textAnchor="middle" fill="#f43f5e" className="text-[9px] font-bold font-mono">Gider: {m.expense.toLocaleString()}</text>
                    <text x={pInc.x} y="47" textAnchor="middle" fill="#93c5fd" className="text-[9px] font-bold font-mono">Kar: {m.netProfit.toLocaleString()}</text>
                  </g>
                  <text x={pInc.x} y="195" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{m.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <CardFoot />
      </div>
    </section>

  );
}

