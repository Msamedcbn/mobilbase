import { NextResponse } from "next/server";
import { localId } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";
import { PLATFORM_KEYS, readPlatformSetting, writePlatformSetting } from "@/lib/platform-settings";

type StudioExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
};

async function readExpenses() {
  return readPlatformSetting<StudioExpense[]>(PLATFORM_KEYS.resellerExpenses, []);
}

export async function GET() {
  const auth = requireRole(["PLATFORM_OWNER", "STUDIO_OPERATOR"]);
  if (auth.error) return auth.error;

  try {
    return NextResponse.json(await readExpenses());
  } catch (error: any) {
    console.error("[studio/expenses] GET", error);
    return NextResponse.json({ error: "Giderler okunamadı" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { category, description, amount, date, id } = body;

    if (!category || !description || typeof amount !== "number" || !date) {
      return NextResponse.json({ error: "Eksik veya geçersiz alanlar" }, { status: 400 });
    }

    const expenses = await readExpenses();
    let next: StudioExpense[];

    if (id) {
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx === -1) {
        return NextResponse.json({ error: "Gider kaydı bulunamadı" }, { status: 404 });
      }
      next = [...expenses];
      next[idx] = { id, category, description, amount, date };
    } else {
      next = [...expenses, { id: localId("exp"), category, description, amount, date }];
    }

    await writePlatformSetting(PLATFORM_KEYS.resellerExpenses, next);
    return NextResponse.json({ success: true, expenses: next });
  } catch (error: any) {
    console.error("[studio/expenses] POST", error);
    return NextResponse.json({ error: "Gider kaydedilemedi" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = requireRole(["PLATFORM_OWNER"]);
  if (auth.error) return auth.error;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Silinecek gider ID belirtilmedi" }, { status: 400 });
    }

    const expenses = await readExpenses();
    const next = expenses.filter((e) => e.id !== id);
    await writePlatformSetting(PLATFORM_KEYS.resellerExpenses, next);

    return NextResponse.json({ success: true, expenses: next });
  } catch (error: any) {
    console.error("[studio/expenses] DELETE", error);
    return NextResponse.json({ error: "Gider silinemedi" }, { status: 500 });
  }
}
