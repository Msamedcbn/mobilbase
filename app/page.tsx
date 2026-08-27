// Pricing comes from an admin-editable store, but it changes rarely — statically
// generate the page and refresh it in the background instead of rendering on
// every request (force-dynamic tanked TTFB and crawl efficiency for no reason).
export const revalidate = 300;

import { PLATFORM_KEYS, readPlatformSetting } from "@/lib/platform-settings";
import { LandingPage } from "@/components/landing-page";

// Kept in sync with DEFAULT_PRICING in app/api/studio/pricing/route.ts — used
// only when the platform owner has never saved pricing.
const FALLBACK_PRICING = {
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
    Lite: { pos: true, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Standart" },
    Service: { pos: true, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Öncelikli" },
    Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hizli" },
    Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 SLA" },
  },
};

export default async function HomePage() {
  // Reads the PlatformSetting table when a database is configured, and the local
  // JSON store in DB-disabled mode — the same source the Studio pricing screen
  // writes to. Reading the JSON file directly meant a platform owner's price
  // change was saved to the database but never reached this page in production.
  const stored = await readPlatformSetting<Partial<typeof FALLBACK_PRICING>>(
    PLATFORM_KEYS.resellerPricing,
    FALLBACK_PRICING,
  );

  const pricing = {
    ...FALLBACK_PRICING,
    ...stored,
    addons: { ...FALLBACK_PRICING.addons, ...(stored?.addons ?? {}) },
    features: { ...FALLBACK_PRICING.features, ...(stored?.features ?? {}) },
  };

  const addons = pricing.addons;

  return <LandingPage pricing={pricing} addons={addons} />;
}
