import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function GET() {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const entries = (store.accountEntries || []).map((entry) => {
      const customer = store.customers.find((c) => c.id === entry.customerId);
      const bankAccount = store.bankAccounts?.find((b) => b.id === entry.bankAccountId);
      return {
        ...entry,
        customer,
        bankAccount,
      };
    });
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(entries);
  }

  const items = await prisma.accountEntry.findMany({ 
    orderBy: { createdAt: "desc" }, 
    include: { customer: true, bankAccount: true } 
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json();

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const newItem = {
      id: localId("entry"),
      customerId: body.customerId,
      type: body.type as "DEBIT" | "CREDIT",
      amount: Number(body.amount),
      description: body.description || null,
      bankAccountId: body.bankAccountId || null,
      createdAt: new Date().toISOString(),
    };
    if (!store.accountEntries) store.accountEntries = [];
    store.accountEntries.push(newItem);

    if (body.bankAccountId) {
      const bank = store.bankAccounts?.find((b) => b.id === body.bankAccountId);
      if (bank) {
        if (body.type === "CREDIT") {
          bank.balance = Number(bank.balance) + Number(body.amount);
        } else if (body.type === "DEBIT") {
          bank.balance = Number(bank.balance) - Number(body.amount);
        }
      }
    }

    await writeLocalStore(store);
    return NextResponse.json(newItem, { status: 201 });
  }

  const { customerId, type, amount, description, bankAccountId } = body;
  
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.accountEntry.create({
      data: {
        customerId,
        type,
        amount: Number(amount),
        description,
        bankAccountId: bankAccountId || null,
      },
      include: {
        customer: true,
        bankAccount: true
      }
    });

    if (bankAccountId) {
      if (type === "CREDIT") {
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { increment: Number(amount) } }
        });
      } else if (type === "DEBIT") {
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { decrement: Number(amount) } }
        });
      }
    }
    return item;
  });

  return NextResponse.json(result, { status: 201 });
}
