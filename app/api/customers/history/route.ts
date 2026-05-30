import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore } from "@/lib/local-store";

type TimelineItem = {
  id: string;
  date: string;
  kind: "ACCOUNT_ENTRY" | "REPAIR" | "TRANSACTION" | "INVOICE";
  title: string;
  amount: number | null;
  direction: "IN" | "OUT" | null;
  detail: string | null;
  status: string | null;
};

export async function GET(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "En az 2 karakter girin." }, { status: 400 });
  }

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const normalized = q.toLocaleLowerCase("tr-TR");
    const customers = store.customers.filter((c) =>
      c.tenantId === tenantId &&
      (c.fullName.toLocaleLowerCase("tr-TR").includes(normalized) || c.phone.includes(q)),
    );

    const customerIds = new Set(customers.map((c) => c.id));
    const deviceIdsByCustomer = new Map<string, Set<string>>();
    for (const d of store.devices) {
      if (!customerIds.has(d.customerId)) continue;
      if (!deviceIdsByCustomer.has(d.customerId)) deviceIdsByCustomer.set(d.customerId, new Set());
      deviceIdsByCustomer.get(d.customerId)?.add(d.id);
    }

    const response = customers.map((customer) => {
      const entries = (store.accountEntries || []).filter((e) => e.customerId === customer.id);
      const transactions = (store.transactions || []).filter((t) => t.customerId === customer.id);
      const repairs = (store.repairs || []).filter((r) => deviceIdsByCustomer.get(customer.id)?.has(r.deviceId));
      const devices = store.devices.filter((d) => d.customerId === customer.id);

      const totalDebit = entries.filter((e) => e.type === "DEBIT").reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalCredit = entries.filter((e) => e.type === "CREDIT").reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const netBalance = totalDebit - totalCredit;

      const timeline: TimelineItem[] = [
        ...entries.map((e) => ({
          id: `entry_${e.id}`,
          date: e.createdAt,
          kind: "ACCOUNT_ENTRY" as const,
          title: e.type === "DEBIT" ? "Borç Kaydı" : "Tahsilat / Alacak",
          amount: Number(e.amount || 0),
          direction: e.type === "DEBIT" ? ("OUT" as const) : ("IN" as const),
          detail: e.description || null,
          status: e.type,
        })),
        ...repairs.map((r) => ({
          id: `repair_${r.id}`,
          date: r.receivedAt || r.createdAt || new Date().toISOString(),
          kind: "REPAIR" as const,
          title: "Tamir Kaydı",
          amount: Number(r.totalCost || 0),
          direction: "OUT" as const,
          detail: r.issueDescription || null,
          status: r.status,
        })),
        ...transactions.map((t) => ({
          id: `txn_${t.id}`,
          date: t.createdAt,
          kind: "TRANSACTION" as const,
          title: t.type === "INCOME" ? "Satış / Gelir İşlemi" : "Gider İşlemi",
          amount: Number(t.totalAmount || 0),
          direction: t.type === "INCOME" ? ("IN" as const) : ("OUT" as const),
          detail: t.note || null,
          status: t.paymentMethod || null,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        customer,
        summary: {
          totalDebit,
          totalCredit,
          netBalance,
          repairCount: repairs.length,
          transactionCount: transactions.length,
          deviceCount: devices.length,
        },
        accountEntries: entries,
        repairs: repairs.map((r) => ({
          ...r,
          device: store.devices.find((d) => d.id === r.deviceId) || null,
        })),
        transactions,
        timeline,
      };
    });

    return NextResponse.json({ q, count: response.length, items: response });
  }

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const customerIds = customers.map((c) => c.id);
  if (customerIds.length === 0) {
    return NextResponse.json({ q, count: 0, items: [] });
  }

  const [entries, repairs, transactions, invoices] = await Promise.all([
    prisma.accountEntry.findMany({
      where: { customerId: { in: customerIds } },
      include: { bankAccount: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairRecord.findMany({
      where: { device: { customerId: { in: customerIds } } },
      include: { device: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { customerId: { in: customerIds }, tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { customerId: { in: customerIds }, tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items = customers.map((customer) => {
    const cEntries = entries.filter((e) => e.customerId === customer.id);
    const cRepairs = repairs.filter((r) => r.device.customerId === customer.id);
    const cTransactions = transactions.filter((t) => t.customerId === customer.id);
    const cInvoices = invoices.filter((inv) => inv.customerId === customer.id);

    const totalDebit = cEntries.filter((e) => e.type === "DEBIT").reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredit = cEntries.filter((e) => e.type === "CREDIT").reduce((sum, e) => sum + Number(e.amount), 0);
    const netBalance = totalDebit - totalCredit;

    const timeline: TimelineItem[] = [
      ...cEntries.map((e) => ({
        id: `entry_${e.id}`,
        date: e.createdAt.toISOString(),
        kind: "ACCOUNT_ENTRY" as const,
        title: e.type === "DEBIT" ? "Borç Kaydı" : "Tahsilat / Alacak",
        amount: Number(e.amount),
        direction: e.type === "DEBIT" ? ("OUT" as const) : ("IN" as const),
        detail: e.description || null,
        status: e.type,
      })),
      ...cRepairs.map((r) => ({
        id: `repair_${r.id}`,
        date: r.receivedAt.toISOString(),
        kind: "REPAIR" as const,
        title: "Tamir Kaydı",
        amount: Number(r.totalCost),
        direction: "OUT" as const,
        detail: r.issueDescription || null,
        status: r.status,
      })),
      ...cTransactions.map((t) => ({
        id: `txn_${t.id}`,
        date: t.createdAt.toISOString(),
        kind: "TRANSACTION" as const,
        title: t.type === "INCOME" ? "Satış / Gelir İşlemi" : "Gider İşlemi",
        amount: Number(t.totalAmount),
        direction: t.type === "INCOME" ? ("IN" as const) : ("OUT" as const),
        detail: t.note || null,
        status: t.paymentMethod || null,
      })),
      ...cInvoices.map((inv) => ({
        id: `inv_${inv.id}`,
        date: inv.issuedAt.toISOString(),
        kind: "INVOICE" as const,
        title: `Fatura ${inv.invoiceNo}`,
        amount: Number(inv.totalAmount),
        direction: "OUT" as const,
        detail: `Tahsilat ${Number(inv.paidAmount).toLocaleString("tr-TR")} TL / Kalan ${Number(inv.dueAmount).toLocaleString("tr-TR")} TL`,
        status: Number(inv.dueAmount) > 0 ? "ACIK" : "KAPALI",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      customer,
      summary: {
        totalDebit,
        totalCredit,
        netBalance,
        repairCount: cRepairs.length,
        transactionCount: cTransactions.length,
        deviceCount: new Set(cRepairs.map((r) => r.deviceId)).size,
      },
      accountEntries: cEntries,
      repairs: cRepairs,
      transactions: cTransactions,
      invoices: cInvoices,
      timeline,
    };
  });

  return NextResponse.json({ q, count: items.length, items });
}
