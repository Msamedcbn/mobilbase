export const dynamic = "force-dynamic";

import { readLocalStore } from "@/lib/local-store";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage() {
  const store = await readLocalStore();

  const pricing = {
    Lite: (store.resellerPricing as any)?.Lite ?? 750,
    Service: (store.resellerPricing as any)?.Service ?? 990,
    Pro: (store.resellerPricing as any)?.Pro ?? 1500,
    Enterprise: (store.resellerPricing as any)?.Enterprise ?? 3500,
    freeBranchLimit: (store.resellerPricing as any)?.freeBranchLimit ?? 5,
    branchSurchargePrice: (store.resellerPricing as any)?.branchSurchargePrice ?? 150,
    addons: {
      apiPackPrice: (store.resellerPricing as any)?.addons?.apiPackPrice ?? 150,
      dbGbPrice: (store.resellerPricing as any)?.addons?.dbGbPrice ?? 200,
      customDevHourly: (store.resellerPricing as any)?.addons?.customDevHourly ?? 1200,
      annualDiscountPct: (store.resellerPricing as any)?.addons?.annualDiscountPct ?? 15,
    },
    features: (store.resellerPricing as any)?.features ?? {
      Lite: { pos: true, repairs: true, stock: false, invoicing: false, buyback: false, supportLevel: "Standart" },
      Service: { pos: false, repairs: true, stock: true, invoicing: false, buyback: false, supportLevel: "Teknik servis odakli" },
      Pro: { pos: true, repairs: true, stock: true, invoicing: true, buyback: false, supportLevel: "Hizli" },
      Enterprise: { pos: true, repairs: true, stock: true, invoicing: true, buyback: true, supportLevel: "7/24 SLA" },
    },
  };

  const addons = pricing.addons;

  return <LandingPage pricing={pricing} addons={addons} />;
}
