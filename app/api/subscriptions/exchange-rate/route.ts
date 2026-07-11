import { NextResponse } from "next/server";
import { fetchUsdToTry } from "@/lib/lemonsqueezy";

/**
 * GET /api/subscriptions/exchange-rate
 * Anlık USD/TRY kurunu döner. Uygulama içinde fiyat gösterimi için kullanılır.
 */
export async function GET() {
  try {
    const rate = await fetchUsdToTry();
    return NextResponse.json(rate, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
