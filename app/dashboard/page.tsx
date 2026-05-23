export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";
import Link from "next/link";

export default async function DashboardPage() {
  const dbDisabled = isDbDisabledMode();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

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
    RECEIVED: "Teslim Alındı",
    IN_PROGRESS: "İşlemde",
    WAITING_PART: "Parça Bekliyor",
    READY: "Hazır",
    DELIVERED: "Teslim Edildi",
    CANCELED: "İptal Edildi",
  };

  const statusColors: Record<string, string> = {
    RECEIVED: "#3b82f6",     // Blue
    IN_PROGRESS: "#f59e0b",  // Amber
    WAITING_PART: "#ef4444", // Red
    READY: "#10b981",        // Emerald
    DELIVERED: "#6366f1",    // Indigo
    CANCELED: "#64748b",     // Slate
  };

  let repairChartData = Object.keys(statusLabels).map((statusKey) => ({
    status: statusKey,
    label: statusLabels[statusKey],
    count: 0,
    color: statusColors[statusKey],
  }));

  try {
    if (dbDisabled) {
      dbUnavailable = true;
      
      // Load live mock data from local-store
      const store = await readLocalStore();
      customerCount = store.customers.length;
      repairCount = (store.repairs || []).length;

      const txs = store.transactions || [];
      const aes = store.accountEntries || [];

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
      const reps = store.repairs || [];
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
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.repairRecord.count(),
        prisma.transaction.aggregate({
          where: { type: "INCOME", createdAt: { gte: startOfDay } },
          _sum: { totalAmount: true },
        }),
        prisma.accountEntry.aggregate({
          where: { type: "CREDIT", createdAt: { gte: startOfDay } },
          _sum: { amount: true },
        }),
        prisma.accountEntry.aggregate({ where: { type: "DEBIT" }, _sum: { amount: true } }),
        prisma.accountEntry.aggregate({ where: { type: "CREDIT" }, _sum: { amount: true } }),
        prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
        // Last 7 days queries
        prisma.transaction.findMany({
          where: {
            type: "INCOME",
            createdAt: { gte: last7DaysData[0].rawDate },
          },
          select: { createdAt: true, totalAmount: true },
        }),
        prisma.accountEntry.findMany({
          where: {
            type: "CREDIT",
            createdAt: { gte: last7DaysData[0].rawDate },
          },
          select: { createdAt: true, amount: true },
        }),
        prisma.repairRecord.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        // Monthly summaries
        prisma.transaction.aggregate({
          where: { type: "INCOME", createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: "EXPENSE", createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true },
        }),
        // 6-Month transactions
        prisma.transaction.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { type: true, totalAmount: true, createdAt: true },
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

  // Fallbacks if no data exists
  const hasDbData = last7DaysData.some((x) => x.sales > 0 || x.collections > 0);
  if (!hasDbData) {
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
    repairChartData.find((x) => x.status === "RECEIVED")!.count = 5;
    repairChartData.find((x) => x.status === "IN_PROGRESS")!.count = 7;
    repairChartData.find((x) => x.status === "WAITING_PART")!.count = 3;
    repairChartData.find((x) => x.status === "READY")!.count = 6;
    repairChartData.find((x) => x.status === "DELIVERED")!.count = 18;
    repairChartData.find((x) => x.status === "CANCELED")!.count = 2;
  }

  const hasSixMonthData = monthsList.some((m) => m.income > 0 || m.expense > 0);
  if (!hasSixMonthData) {
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
    recentLogs = [
      { id: "mock-1", createdAt: new Date(Date.now() - 1000 * 60 * 12), action: "POS_CHECKOUT", entityType: "Transaction", entityId: "tr-9304", detail: "POS-1716298000 / 1,299.00 TL" },
      { id: "mock-2", createdAt: new Date(Date.now() - 1000 * 60 * 45), action: "REPAIR_RECEIVED", entityType: "RepairRecord", entityId: "rep-0210", detail: "iPhone 11 Ekran Değişimi" },
      { id: "mock-3", createdAt: new Date(Date.now() - 1000 * 60 * 120), action: "INVENTORY_UPDATE", entityType: "StockItem", entityId: "stk-4482", detail: "Stok kartı güncellemesi" },
      { id: "mock-4", createdAt: new Date(Date.now() - 1000 * 60 * 240), action: "CUSTOMER_CREATE", entityType: "Customer", entityId: "cust-9941", detail: "Ahmet Yılmaz (532xxxxxxx)" },
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
    <section className="space-y-8 animate-fade-in pb-12">
      
      {/* DB Warning banner */}
      {(dbUnavailable || dbDisabled) && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/75 p-4 text-amber-900 shadow-sm backdrop-blur-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold">!</span>
          <div className="text-sm">
            <span className="font-semibold block">Demo Modu Aktif</span>
            {dbDisabled
              ? "Sistem DB'siz modda çalışıyor. Gösterilen grafikler ve istatistikler tanıtım amaçlı simüle edilmiştir."
              : "Veritabanına bağlanılamadı (localhost:5432). Lütfen PostgreSQL servisini kontrol edin. Gösterilen veriler simüle edilmiştir."}
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            TelefoncuPro Yönetim Paneli
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dükkanınızın bugünkü genel finansal sağlığı ve işleyişi.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 p-2 shadow-sm text-xs text-slate-600 font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse"></span>
          Canlı İzleme Penceresi - {new Date().toLocaleDateString("tr-TR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Aylık Toplam Satış (Income) */}
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aylık Toplam Satış</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              💵
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800">{monthlyIncome.toLocaleString("tr-TR")} TL</h3>
            <p className="text-[10px] text-slate-400 mt-1">Bu ay kasaya giren brüt ciro</p>
          </div>
        </div>

        {/* Aylık Toplam Gider (Expenses) */}
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aylık Toplam Gider</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              📉
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-600">-{monthlyExpense.toLocaleString("tr-TR")} TL</h3>
            <p className="text-[10px] text-slate-400 mt-1">Bu ayki toplam dükkan harcaması</p>
          </div>
        </div>

        {/* Aylık Net Kâr (Net Profit) */}
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aylık Net Kâr</span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${monthlyNetProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
              📈
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black ${monthlyNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {monthlyNetProfit.toLocaleString("tr-TR")} TL
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Satışlardan giderlerin düşülmüş hâli</p>
          </div>
        </div>

        {/* Toplam Veresiye Alacak */}
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Veresiye Alacakları</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              💳
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800">{veresiyeBalance.toLocaleString("tr-TR")} TL</h3>
            <p className="text-[10px] text-slate-400 mt-1">Müşterilerden beklenen bakiye</p>
          </div>
        </div>

      </div>

      {/* Stats Cards Grid (Primary Operations) */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        
        {/* Toplam Musteri */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Müşteri Sayısı</p>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">{customerCount}</h3>
        </div>

        {/* Servis Kaydi */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Cihaz Servis Kaydı</p>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">{repairCount}</h3>
        </div>


        {/* Bugunku Ciro */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Günlük Brüt Satış</p>
          <h3 className="text-xl font-extrabold text-teal-800 mt-1">{dailySales.toLocaleString("tr-TR")} TL</h3>
        </div>

        {/* Bugunku Tahsilat */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Günlük Nakit Girişi</p>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">{dailyTahsilat.toLocaleString("tr-TR")} TL</h3>
        </div>

      </div>

      {/* 6-Month Income vs Expense vs Net Profit SVG Graph */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Net Kâr & Bilanço Gelişimi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Son 6 ayın gelir, gider ve net kâr değişim grafiği</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-teal-600"></span>
              <span className="text-slate-600">Satış/Gelir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-500"></span>
              <span className="text-slate-600">Giderler</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-indigo-600"></span>
              <span className="text-slate-600">Net Kâr</span>
            </div>
          </div>
        </div>

        {/* SVG Area / Line Chart for 6 Months */}
        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 600 220" className="w-full min-w-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            {/* Gradients definitions */}
            <defs>
              <linearGradient id="netProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="45" y1="30" x2="570" y2="30" stroke="#f8fafc" strokeWidth="1.5" />
            <line x1="45" y1="75" x2="570" y2="75" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="45" y1="120" x2="570" y2="120" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="45" y1="170" x2="570" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Axis Y Labels */}
            <text x="35" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">{max6MonthVal.toLocaleString("tr-TR")}</text>
            <text x="35" y="79" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">{(max6MonthVal * 0.65).toLocaleString("tr-TR")}</text>
            <text x="35" y="124" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">{(max6MonthVal * 0.35).toLocaleString("tr-TR")}</text>
            <text x="35" y="174" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold">0</text>

            {/* Net Profit Area Fill */}
            <path d={netProfitAreaPath} fill="url(#netProfitGrad)" />

            {/* Path lines */}
            <path d={incomeLinePath} stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={expenseLinePath} stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={netProfitLinePath} stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Interaction points circles */}
            {monthsList.map((m, idx) => {
              const pInc = pointsIncome[idx];
              const pExp = pointsExpense[idx];
              const pNet = pointsNetProfit[idx];

              return (
                <g key={m.label} className="group/node">
                  
                  {/* Vertical hover alignment line */}
                  <line x1={pInc.x} y1="30" x2={pInc.x} y2="170" stroke="#cbd5e1" strokeDasharray="3 3" className="opacity-0 group-hover/node:opacity-100 transition-opacity" />

                  {/* Income point */}
                  <circle cx={pInc.x} cy={pInc.y} r="4.5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" className="transition-all hover:scale-150" />
                  
                  {/* Expense point */}
                  <circle cx={pExp.x} cy={pExp.y} r="4.5" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" className="transition-all hover:scale-150" />

                  {/* Net Profit point */}
                  <circle cx={pNet.x} cy={pNet.y} r="5.5" fill="#4f46e5" stroke="#fff" strokeWidth="2" className="transition-all hover:scale-150" />

                  {/* Tooltip detail block */}
                  <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <rect x={pInc.x - 60} y="5" width="120" height="42" rx="8" fill="#0f172a" />
                    <text x={pInc.x} y="16" textAnchor="middle" fill="#fff" className="text-[8px] font-bold">Gelir: {m.income.toLocaleString()}</text>
                    <text x={pInc.x} y="27" textAnchor="middle" fill="#f43f5e" className="text-[8px] font-bold">Gider: {m.expense.toLocaleString()}</text>
                    <text x={pInc.x} y="38" textAnchor="middle" fill="#818cf8" className="text-[8px] font-bold">Net Kâr: {m.netProfit.toLocaleString()}</text>
                  </g>

                  {/* X Axis label */}
                  <text x={pInc.x} y="190" textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">{m.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Analytics Charts Grid (7-Day & Doughnut) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Weekly Income Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Haftalık Finansal Performans</h3>
              <p className="text-xs text-slate-400 mt-0.5">Son 7 günlük satış ve nakit tahsilat karşılaştırması</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-teal-500"></span>
                <span className="text-slate-600">POS Satış</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-indigo-500"></span>
                <span className="text-slate-600">Nakit Girişi / Tahsilat</span>
              </div>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 600 220" className="w-full min-w-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="580" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="170" x2="580" y2="170" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="32" y="34" textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{maxBarVal.toLocaleString("tr-TR")}</text>
              <text x="32" y="84" textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{(maxBarVal * 0.6).toLocaleString("tr-TR")}</text>
              <text x="32" y="134" textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{(maxBarVal * 0.3).toLocaleString("tr-TR")}</text>
              <text x="32" y="174" textAnchor="end" className="text-[10px] fill-slate-400 font-medium">0</text>

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
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <rect x={xBase - 15} y="2" width="76" height="24" rx="6" fill="#0f172a" />
                      <text x={xBase + 23} y="14" textAnchor="middle" fill="#fff" className="text-[8px] font-bold">
                        S:{d.sales.toLocaleString()} / T:{d.collections.toLocaleString()}
                      </text>
                    </g>

                    {/* Sales Bar */}
                    <rect
                      x={xBase}
                      y={salesY}
                      width="16"
                      height={Math.max(salesH, 1)}
                      rx="3"
                      fill="#0f766e"
                      className="transition-all duration-300 hover:fill-teal-600"
                    />
                    {/* Collections Bar */}
                    <rect
                      x={xBase + 19}
                      y={collY}
                      width="16"
                      height={Math.max(collH, 1)}
                      rx="3"
                      fill="#6366f1"
                      className="transition-all duration-300 hover:fill-indigo-600"
                    />

                    {/* Axis Labels */}
                    <text x={xBase + 17} y="192" textAnchor="middle" className="text-[10px] fill-slate-500 font-semibold">{d.dayName}</text>
                    <text x={xBase + 17} y="206" textAnchor="middle" className="text-[9px] fill-slate-400 font-medium">{d.dateStr}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Repair Status Doughnut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Servis Cihaz Dağılımı</h3>
            <p className="text-xs text-slate-400 mt-0.5">Teknik servisteki aktif arıza kayıtlarının durumu</p>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative">
            {/* Doughnut SVG */}
            <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
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
              <span className="text-3xl font-extrabold text-slate-800">{totalRepairs}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cihaz</span>
            </div>
          </div>

          {/* Color legends */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {repairChartData.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full block shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 truncate">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs and Actions */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Chronological Timeline Audit logs */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Son İşlem Kayıtları</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sistem genelinde gerçekleştirilen son hareketler</p>
            </div>
            <span className="text-xs text-teal-600 font-bold hover:underline cursor-pointer">Tümünü Gör</span>
          </div>

          <div className="relative border-l border-slate-100 ml-3 pl-6 space-y-6">
            {recentLogs.map((log) => {
              let badgeColor = "bg-slate-100 text-slate-700";
              if (log.action.includes("CHECKOUT")) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
              else if (log.action.includes("REPAIR")) badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
              else if (log.action.includes("RECONCILIATION")) badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
              else if (log.action.includes("CREATE")) badgeColor = "bg-teal-50 text-teal-700 border-teal-100";

              return (
                <div key={log.id} className="relative group">
                  <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-slate-300 ring-4 ring-white group-hover:bg-teal-500 transition-colors"></span>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
                        {log.action.replace("_", " ")}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {log.entityType} ({log.entityId?.slice(-6)})
                      </span>
                    </div>
                    <time className="text-xs text-slate-400 font-medium">
                      {new Date(log.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {log.detail ? log.detail : `${log.entityType} üzerinde aksiyon tamamlandı.`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Hızlı Kısayollar</h3>
            <p className="text-xs text-slate-400 mb-4">Sık yapılan işlemlere anında erişim sağlayın</p>
          </div>

          <div className="space-y-3">
            <Link href="/pos" className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-100 hover:border-teal-200 bg-slate-50/50 hover:bg-teal-50/20 text-slate-700 hover:text-teal-800 font-semibold text-sm transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">🛒</span>
              Yeni POS Satışı Yap
            </Link>
            <Link href="/tamir-takip" className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/20 text-slate-700 hover:text-blue-800 font-semibold text-sm transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">🔧</span>
              Arıza / Tamir Kaydı Aç
            </Link>
            <Link href="/musteriler-veresiye" className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-100 hover:border-rose-200 bg-slate-50/50 hover:bg-rose-50/20 text-slate-700 hover:text-rose-800 font-semibold text-sm transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">💳</span>
              Cari Hesap / Borç Al
            </Link>
            <Link href="/giderler" className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-100 hover:border-amber-200 bg-slate-50/50 hover:bg-amber-50/20 text-slate-700 hover:text-amber-800 font-semibold text-sm transition-all">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">📉</span>
              Gider Yönetim Paneli
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">Versiyon 1.1.0 • TelefoncuPro</span>
          </div>
        </div>
      </div>
    </section>
  );
}
