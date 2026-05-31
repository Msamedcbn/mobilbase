import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

type ActionType = "EXTERNAL_PURCHASE" | "EXTERNAL_SALE" | "INTERNAL_TRANSFER";

export async function GET() {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const products = [
      { id: "demo-prod-1", name: "Type-C Hizli Sarj Adaptoru" },
      { id: "demo-prod-2", name: "Temperli Cam" },
    ];
    const branches = (store.branches || []).filter((b) => b.tenantId === tenantId);
    const movements = (store.transactions || [])
      .filter((t) => (t.note || "").includes("[WHOLESALE]"))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);
    return NextResponse.json({ products, branches, movements });
  }

  const [products, branches, movements] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.transaction.findMany({
      where: { tenantId, note: { contains: "[WHOLESALE]", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { branch: true },
    }),
  ]);

  return NextResponse.json({ products, branches, movements });
}

export async function POST(req: Request) {
  const auth = requireRole(["ADMIN", "CASHIER", "MANAGER"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user.tenantId;

  try {
    const body = await req.json();
    const action = String(body.action || "") as ActionType;
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity || 0);
    const unitPrice = Number(body.unitPrice || 0);
    const totalAmount = Number((quantity * unitPrice).toFixed(2));
    const invoiceNo = body.invoiceNo ? String(body.invoiceNo) : "";
    const sourceBranchId = body.sourceBranchId ? String(body.sourceBranchId) : "";
    const targetBranchId = body.targetBranchId ? String(body.targetBranchId) : "";
    const note = body.note ? String(body.note) : "";

    if (!productId || quantity <= 0 || unitPrice < 0) {
      return NextResponse.json({ error: "Ürün, adet ve birim fiyat zorunludur." }, { status: 400 });
    }

    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      if (!store.productBranchStocks) store.productBranchStocks = [];
      if (!store.transactions) store.transactions = [];

      const applyBranch = (branchId: string, delta: number) => {
        const idx = store.productBranchStocks!.findIndex((s) => s.productId === productId && s.branchId === branchId);
        if (idx === -1) {
          if (delta < 0) return false;
          store.productBranchStocks!.push({ id: localId("pbs"), productId, branchId, stock: delta });
          return true;
        }
        const next = store.productBranchStocks![idx].stock + delta;
        if (next < 0) return false;
        store.productBranchStocks![idx].stock = next;
        return true;
      };

      if (action === "EXTERNAL_PURCHASE") {
        if (!targetBranchId) return NextResponse.json({ error: "Hedef şube zorunludur." }, { status: 400 });
        if (!applyBranch(targetBranchId, quantity)) return NextResponse.json({ error: "Stok artisi uygulanamadi." }, { status: 400 });

        store.transactions.unshift({ id: localId("tr"), tenantId, transactionNo: `EXP-${Date.now()}`, type: "EXPENSE", paymentMethod: "CASH", customerId: null, totalAmount, note: `[WHOLESALE][EXTERNAL_PURCHASE] ${invoiceNo ? `Belge:${invoiceNo} ` : ""}${note}`.trim(), createdAt: new Date().toISOString(), branchId: targetBranchId });
      } else if (action === "EXTERNAL_SALE") {
        if (!sourceBranchId) return NextResponse.json({ error: "Kaynak şube zorunludur." }, { status: 400 });
        if (!applyBranch(sourceBranchId, -quantity)) return NextResponse.json({ error: "Kaynak şube stok yetersiz." }, { status: 400 });

        store.transactions.unshift({ id: localId("tr"), tenantId, transactionNo: `INC-${Date.now()}`, type: "INCOME", paymentMethod: "CASH", customerId: null, totalAmount, note: `[WHOLESALE][EXTERNAL_SALE] ${invoiceNo ? `Belge:${invoiceNo} ` : ""}${note}`.trim(), createdAt: new Date().toISOString(), branchId: sourceBranchId });
      } else if (action === "INTERNAL_TRANSFER") {
        if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId) return NextResponse.json({ error: "Kaynak/hedef şube bilgisi geçersiz." }, { status: 400 });
        if (!applyBranch(sourceBranchId, -quantity)) return NextResponse.json({ error: "Kaynak şube stok yetersiz." }, { status: 400 });
        if (!applyBranch(targetBranchId, quantity)) return NextResponse.json({ error: "Hedef stok güncellenemedi." }, { status: 400 });

        const ref = `IC-${Date.now()}`;
        store.transactions.unshift({ id: localId("tr"), tenantId, transactionNo: `INC-${Date.now()}-S`, type: "INCOME", paymentMethod: "ON_ACCOUNT", customerId: null, totalAmount, note: `[WHOLESALE][INTERNAL_SELL] Ref:${ref} ${note}`.trim(), createdAt: new Date().toISOString(), branchId: sourceBranchId });
        store.transactions.unshift({ id: localId("tr"), tenantId, transactionNo: `EXP-${Date.now()}-A`, type: "EXPENSE", paymentMethod: "ON_ACCOUNT", customerId: null, totalAmount, note: `[WHOLESALE][INTERNAL_BUY] Ref:${ref} ${note}`.trim(), createdAt: new Date().toISOString(), branchId: targetBranchId });
      } else {
        return NextResponse.json({ error: "Geçersiz aksiyon." }, { status: 400 });
      }

      await writeLocalStore(store);
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      const adjustBranchStock = async (branchId: string, delta: number) => {
        const current = await tx.productBranchStock.findUnique({ where: { productId_branchId: { productId, branchId } } });
        if (!current) {
          if (delta < 0) throw new Error("Kaynak şube stok kaydi yok");
          await tx.productBranchStock.create({ data: { productId, branchId, stock: delta } });
          return;
        }
        const next = current.stock + delta;
        if (next < 0) throw new Error("Kaynak şube stok yetersiz");
        await tx.productBranchStock.update({ where: { id: current.id }, data: { stock: next } });
      };

      if (action === "EXTERNAL_PURCHASE") {
        if (!targetBranchId) throw new Error("Hedef şube zorunlu");
        await adjustBranchStock(targetBranchId, quantity);
        await tx.transaction.create({ data: { tenantId, transactionNo: `EXP-${Date.now()}`, type: "EXPENSE", paymentMethod: "CASH", customerId: null, totalAmount, note: `[WHOLESALE][EXTERNAL_PURCHASE] ${invoiceNo ? `Belge:${invoiceNo} ` : ""}${note}`.trim(), branchId: targetBranchId } });
      } else if (action === "EXTERNAL_SALE") {
        if (!sourceBranchId) throw new Error("Kaynak şube zorunlu");
        await adjustBranchStock(sourceBranchId, -quantity);
        await tx.transaction.create({ data: { tenantId, transactionNo: `INC-${Date.now()}`, type: "INCOME", paymentMethod: "CASH", customerId: null, totalAmount, note: `[WHOLESALE][EXTERNAL_SALE] ${invoiceNo ? `Belge:${invoiceNo} ` : ""}${note}`.trim(), branchId: sourceBranchId } });
      } else if (action === "INTERNAL_TRANSFER") {
        if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId) throw new Error("Kaynak/hedef şube geçersiz");
        await adjustBranchStock(sourceBranchId, -quantity);
        await adjustBranchStock(targetBranchId, quantity);
        const ref = `IC-${Date.now()}`;
        await tx.transaction.create({ data: { tenantId, transactionNo: `INC-${Date.now()}-S`, type: "INCOME", paymentMethod: "ON_ACCOUNT", customerId: null, totalAmount, note: `[WHOLESALE][INTERNAL_SELL] Ref:${ref} ${note}`.trim(), branchId: sourceBranchId } });
        await tx.transaction.create({ data: { tenantId, transactionNo: `EXP-${Date.now()}-A`, type: "EXPENSE", paymentMethod: "ON_ACCOUNT", customerId: null, totalAmount, note: `[WHOLESALE][INTERNAL_BUY] Ref:${ref} ${note}`.trim(), branchId: targetBranchId } });
      } else {
        throw new Error("Geçersiz aksiyon");
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "İşlem başarısız" }, { status: 400 });
  }
}

