import { NextResponse } from "next/server";
import { readLocalStore, writeLocalStore } from "@/lib/local-store";

const DEFAULT_PRICING = {
  Lite: 750,
  Pro: 1500,
  Enterprise: 3500,
  freeBranchLimit: 5,
  branchSurchargePrice: 150,
  addons: {
    apiPackPrice: 150,
    dbGbPrice: 200,
    customDevHourly: 1200,
    annualDiscountPct: 15
  },
  features: {
    Lite: {
      pos: true,
      repairs: true,
      stock: false,
      invoicing: false,
      buyback: false,
      supportLevel: "Standart E-Posta Destek"
    },
    Pro: {
      pos: true,
      repairs: true,
      stock: true,
      invoicing: true,
      buyback: false,
      supportLevel: "Hızlı Destek (Mesai Saatleri)"
    },
    Enterprise: {
      pos: true,
      repairs: true,
      stock: true,
      invoicing: true,
      buyback: true,
      supportLevel: "7/24 Telefon & SLA Desteği"
    }
  }
};

export async function GET() {
  try {
    const store = await readLocalStore();
    const pricing = store.resellerPricing || DEFAULT_PRICING;
    // Safely merge defaults if subfields are missing
    return NextResponse.json({
      ...DEFAULT_PRICING,
      ...pricing,
      addons: { ...DEFAULT_PRICING.addons, ...(pricing.addons || {}) },
      features: {
        Lite: { ...DEFAULT_PRICING.features.Lite, ...(pricing.features?.Lite || {}) },
        Pro: { ...DEFAULT_PRICING.features.Pro, ...(pricing.features?.Pro || {}) },
        Enterprise: { ...DEFAULT_PRICING.features.Enterprise, ...(pricing.features?.Enterprise || {}) }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fiyatlandırma ayarları okunamadı" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { Lite, Pro, Enterprise, freeBranchLimit, branchSurchargePrice, addons, features } = body;

    if (
      typeof Lite !== "number" ||
      typeof Pro !== "number" ||
      typeof Enterprise !== "number" ||
      typeof freeBranchLimit !== "number" ||
      typeof branchSurchargePrice !== "number"
    ) {
      return NextResponse.json({ error: "Geçersiz veri formatı" }, { status: 400 });
    }

    const store = await readLocalStore();
    store.resellerPricing = {
      Lite,
      Pro,
      Enterprise,
      freeBranchLimit,
      branchSurchargePrice,
      addons: addons || DEFAULT_PRICING.addons,
      features: features || DEFAULT_PRICING.features
    };

    await writeLocalStore(store);
    return NextResponse.json({ success: true, pricing: store.resellerPricing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fiyatlandırma güncellenemedi" }, { status: 500 });
  }
}
