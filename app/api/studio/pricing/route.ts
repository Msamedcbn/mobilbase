import { NextResponse } from "next/server";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";
import { requireRole } from "@/lib/auth";

const DEFAULT_PRICING = {
  Lite: 750,
  Service: 990,
  Pro: 1500,
  Enterprise: 3500,
  freeBranchLimit: 5,
  branchSurchargePrice: 150,
  addons: {
    apiPackPrice: 150,
    dbGbPrice: 200,
    customDevHourly: 1200,
    annualDiscountPct: 15,
  },
  features: {
    Lite: {
      pos: true,
      repairs: true,
      stock: false,
      invoicing: false,
      buyback: false,
      supportLevel: "Standart E-Posta Destek",
    },
    Service: {
      pos: false,
      repairs: true,
      stock: true,
      invoicing: false,
      buyback: false,
      supportLevel: "Teknik Servis Odakli Destek",
    },
    Pro: {
      pos: true,
      repairs: true,
      stock: true,
      invoicing: true,
      buyback: false,
      supportLevel: "Hizli Destek (Mesai Saatleri)",
    },
    Enterprise: {
      pos: true,
      repairs: true,
      stock: true,
      invoicing: true,
      buyback: true,
      supportLevel: "7/24 Telefon & SLA Destegi",
    },
  },
};

export async function GET() {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  try {
    const store = await readLocalStore();
    const pricing = store.resellerPricing || DEFAULT_PRICING;
    return NextResponse.json({
      ...DEFAULT_PRICING,
      ...pricing,
      addons: { ...DEFAULT_PRICING.addons, ...(pricing.addons || {}) },
      features: {
        Lite: { ...DEFAULT_PRICING.features.Lite, ...(pricing.features?.Lite || {}) },
        Service: { ...DEFAULT_PRICING.features.Service, ...(pricing.features?.Service || {}) },
        Pro: { ...DEFAULT_PRICING.features.Pro, ...(pricing.features?.Pro || {}) },
        Enterprise: { ...DEFAULT_PRICING.features.Enterprise, ...(pricing.features?.Enterprise || {}) },
      },
      history: (store.resellerPricingHistory || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fiyatlandirma ayarlari okunamadi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const { Lite, Service, Pro, Enterprise, freeBranchLimit, branchSurchargePrice, addons, features, reason, actor } = body;

    if (
      typeof Lite !== "number" ||
      typeof Service !== "number" ||
      typeof Pro !== "number" ||
      typeof Enterprise !== "number" ||
      typeof freeBranchLimit !== "number" ||
      typeof branchSurchargePrice !== "number" ||
      Lite < 0 ||
      Service < 0 ||
      Pro < 0 ||
      Enterprise < 0 ||
      freeBranchLimit < 0 ||
      branchSurchargePrice < 0
    ) {
      return NextResponse.json({ error: "Geçersiz veri formati" }, { status: 400 });
    }

    const store = await readLocalStore();
    const nextPricing = {
      Lite,
      Service,
      Pro,
      Enterprise,
      freeBranchLimit,
      branchSurchargePrice,
      addons: addons || DEFAULT_PRICING.addons,
      features: features || DEFAULT_PRICING.features,
    };

    store.resellerPricing = nextPricing;
    store.resellerPricingHistory = store.resellerPricingHistory || [];
    store.resellerPricingHistory.unshift({
      id: localId("pricing-hst"),
      createdAt: new Date().toISOString(),
      createdBy: typeof actor === "string" && actor.trim() ? actor.trim() : "StudioAdmin",
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : "Fiyatlandirma guncellemesi",
      snapshot: nextPricing,
    });

    store.studioAuditLogs = store.studioAuditLogs || [];
    store.studioAuditLogs.unshift({
      id: localId("audit"),
      createdAt: new Date().toISOString(),
      actor: typeof actor === "string" && actor.trim() ? actor.trim() : "StudioAdmin",
      action: "PRICING_UPDATE",
      targetType: "PRICING",
      targetId: "resellerPricing",
      detail: `${Lite}/${Service}/${Pro}/${Enterprise} fiyatlari güncellendi`,
      context: { reason: reason || null },
    });

    await writeLocalStore(store);
    return NextResponse.json({ success: true, pricing: store.resellerPricing, history: store.resellerPricingHistory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fiyatlandirma güncellenemedi" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = requireRole(["ADMIN", "PLATFORM_OWNER"]);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const historyId = typeof body.historyId === "string" ? body.historyId : "";
    const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "StudioAdmin";
    if (!historyId) return NextResponse.json({ error: "historyId zorunludur" }, { status: 400 });

    const store = await readLocalStore();
    const item = (store.resellerPricingHistory || []).find((x) => x.id === historyId);
    if (!item) return NextResponse.json({ error: "Gecmis kaydi bulunamadi" }, { status: 404 });

    store.resellerPricing = {
      ...DEFAULT_PRICING,
      ...item.snapshot,
      addons: { ...DEFAULT_PRICING.addons, ...(item.snapshot.addons || {}) },
      features: {
        Lite: { ...DEFAULT_PRICING.features.Lite, ...((item.snapshot.features as any)?.Lite || {}) },
        Service: { ...DEFAULT_PRICING.features.Service, ...((item.snapshot.features as any)?.Service || {}) },
        Pro: { ...DEFAULT_PRICING.features.Pro, ...((item.snapshot.features as any)?.Pro || {}) },
        Enterprise: { ...DEFAULT_PRICING.features.Enterprise, ...((item.snapshot.features as any)?.Enterprise || {}) },
      },
    };

    store.resellerPricingHistory = store.resellerPricingHistory || [];
    store.resellerPricingHistory.unshift({
      id: localId("pricing-hst"),
      createdAt: new Date().toISOString(),
      createdBy: actor,
      reason: `Geri alma: ${historyId}`,
      snapshot: store.resellerPricing,
    });

    store.studioAuditLogs = store.studioAuditLogs || [];
    store.studioAuditLogs.unshift({
      id: localId("audit"),
      createdAt: new Date().toISOString(),
      actor,
      action: "PRICING_REVERT",
      targetType: "PRICING",
      targetId: historyId,
      detail: "Fiyatlandirma geri alindi",
    });

    await writeLocalStore(store);
    return NextResponse.json({ success: true, pricing: store.resellerPricing, history: store.resellerPricingHistory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fiyatlandirma geri alinamadi" }, { status: 500 });
  }
}

