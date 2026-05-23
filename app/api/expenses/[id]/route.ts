import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.transactions || []).find((t) => t.id === params.id && t.type === "EXPENSE");
    if (!item) {
      return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(item);
  }

  const item = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { branch: true },
  });
  if (!item || item.type !== "EXPENSE") {
    return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const initialLength = store.transactions?.length || 0;
      store.transactions = (store.transactions || []).filter((t) => t.id !== params.id);
      
      if ((store.transactions?.length || 0) === initialLength) {
        return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
      }

      await writeLocalStore(store);
      return NextResponse.json({ ok: true });
    }

    // In DB mode, check if transaction exists and is of type EXPENSE before deleting
    const tx = await prisma.transaction.findUnique({ where: { id: params.id } });
    if (!tx || tx.type !== "EXPENSE") {
      return NextResponse.json({ error: "Gider bulunamadı veya silinemez" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider silinirken hata oluştu" }, { status: 500 });
  }
}
