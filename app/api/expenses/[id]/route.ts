import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";
import { getSessionUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const item = (store.transactions || []).find((t) => t.id === params.id && t.type === "EXPENSE" && t.tenantId === tenantId);
    if (!item) {
      return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
    }
    return NextResponse.json(item);
  }

  const item = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId },
    include: { branch: true },
  });
  if (!item || item.type !== "EXPENSE") {
    return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = user.tenantId;

  try {
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      const existingIdx = store.transactions?.findIndex((t) => t.id === params.id && t.type === "EXPENSE" && t.tenantId === tenantId) ?? -1;
      if (existingIdx === -1) {
        return NextResponse.json({ error: "Gider bulunamadı" }, { status: 404 });
      }
      store.transactions = store.transactions.filter((t) => t.id !== params.id);
      await writeLocalStore(store);
      return NextResponse.json({ ok: true });
    }

    // In DB mode, check if transaction exists and belongs to tenant before deleting
    const tx = await prisma.transaction.findFirst({ where: { id: params.id, tenantId } });
    if (!tx || tx.type !== "EXPENSE") {
      return NextResponse.json({ error: "Gider bulunamadı veya silinemez" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider silinirken hata oluştu" }, { status: 500 });
  }
}
