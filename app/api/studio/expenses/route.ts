import { NextResponse } from "next/server";
import { readLocalStore, writeLocalStore, localId } from "@/lib/local-store";

export async function GET() {
  try {
    const store = await readLocalStore();
    return NextResponse.json(store.resellerExpenses || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Giderler okunamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, description, amount, date, id } = body;

    if (!category || !description || typeof amount !== "number" || !date) {
      return NextResponse.json({ error: "Eksik veya geçersiz alanlar" }, { status: 400 });
    }

    const store = await readLocalStore();
    if (!store.resellerExpenses) {
      store.resellerExpenses = [];
    }

    if (id) {
      // Edit existing
      const idx = store.resellerExpenses.findIndex((e) => e.id === id);
      if (idx !== -1) {
        store.resellerExpenses[idx] = { id, category, description, amount, date };
      } else {
        return NextResponse.json({ error: "Gider kaydı bulunamadı" }, { status: 404 });
      }
    } else {
      // Create new
      const newExpense = {
        id: localId("exp"),
        category,
        description,
        amount,
        date,
      };
      store.resellerExpenses.push(newExpense);
    }

    await writeLocalStore(store);
    return NextResponse.json({ success: true, expenses: store.resellerExpenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider kaydedilemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Silinecek gider ID belirtilmedi" }, { status: 400 });
    }

    const store = await readLocalStore();
    if (!store.resellerExpenses) {
      store.resellerExpenses = [];
    }

    store.resellerExpenses = store.resellerExpenses.filter((e) => e.id !== id);
    await writeLocalStore(store);

    return NextResponse.json({ success: true, expenses: store.resellerExpenses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gider silinemedi" }, { status: 500 });
  }
}
