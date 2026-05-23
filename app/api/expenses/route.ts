import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const expenses = (store.transactions || [])
      .filter((t) => t.type === "EXPENSE")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(expenses);
  }

  const items = await prisma.transaction.findMany({
    where: { type: "EXPENSE" },
    orderBy: { createdAt: "desc" },
    include: { branch: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { totalAmount, paymentMethod, note, branchId } = body;

    if (totalAmount === undefined || totalAmount <= 0) {
      return NextResponse.json({ error: "Geçerli bir tutar girilmelidir" }, { status: 400 });
    }

    const transactionNo = `EXP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.transactions) store.transactions = [];

      const newItem = {
        id: localId("tr"),
        transactionNo,
        type: "EXPENSE" as const,
        paymentMethod: paymentMethod || "CASH",
        customerId: null,
        totalAmount: Number(totalAmount),
        note: note || "",
        createdAt: new Date().toISOString(),
        branchId: branchId || "branch-kadikoy",
      };

      store.transactions.unshift(newItem);
      await writeLocalStore(store);

      return NextResponse.json(newItem, { status: 201 });
    }

    const item = await prisma.transaction.create({
      data: {
        transactionNo,
        type: "EXPENSE",
        paymentMethod: paymentMethod || "CASH",
        customerId: null,
        totalAmount: Number(totalAmount),
        note: note || "",
        branchId: branchId || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider eklenirken bir hata oluştu" }, { status: 500 });
  }
}
