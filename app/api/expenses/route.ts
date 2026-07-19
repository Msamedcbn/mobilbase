import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const expenses = (store.transactions || [])
      .filter((t) => t.type === "EXPENSE" && t.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(expenses);
  }

  const items = await prisma.transaction.findMany({
    where: { type: "EXPENSE", tenantId },
    orderBy: { createdAt: "desc" },
    include: { branch: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  try {
    const body = await req.json();
    const { totalAmount, paymentMethod, note, branchId, bankAccountId } = body;

    if (totalAmount === undefined || totalAmount <= 0) {
      return NextResponse.json({ error: "Geçerli bir tutar girilmelidir" }, { status: 400 });
    }

    const transactionNo = `EXP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.transactions) store.transactions = [];

      if (bankAccountId) {
        const bank = (store.bankAccounts || []).find((b) => b.id === bankAccountId && b.tenantId === tenantId);
        if (!bank) return NextResponse.json({ error: "Kasa/banka hesabı bulunamadı" }, { status: 404 });
        bank.balance = Number(bank.balance) - Number(totalAmount);
      }

      const newItem = {
        id: localId("tr"),
        transactionNo,
        tenantId,
        type: "EXPENSE" as const,
        paymentMethod: paymentMethod || "CASH",
        customerId: null,
        totalAmount: Number(totalAmount),
        note: note || "",
        createdAt: new Date().toISOString(),
        branchId: branchId || "branch-kadikoy",
        bankAccountId: bankAccountId || null,
      };

      store.transactions.unshift(newItem);
      await writeLocalStore(store);

      return NextResponse.json(newItem, { status: 201 });
    }

    const item = await prisma.$transaction(async (tx) => {
      if (bankAccountId) {
        const bank = await tx.bankAccount.findFirst({ where: { id: bankAccountId, tenantId }, select: { id: true } });
        if (!bank) throw Object.assign(new Error("Kasa/banka hesabı bulunamadı"), { status: 404 });
        await tx.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: Number(totalAmount) } } });
      }

      return tx.transaction.create({
        data: {
          transactionNo,
          tenantId,
          type: "EXPENSE",
          paymentMethod: paymentMethod || "CASH",
          customerId: null,
          totalAmount: Number(totalAmount),
          note: note || "",
          branchId: branchId || null,
          bankAccountId: bankAccountId || null,
        },
      });
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider eklenirken bir hata oluştu" }, { status: error.status || 500 });
  }
}
