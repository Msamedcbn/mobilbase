import { readLocalStore } from "@/lib/local-store";
import { BuybackCalculator } from "./calculator";
import { PublicHeader } from "@/components/public-header";

export const dynamic = "force-dynamic";

export default async function TakasHesaplaPage() {
  const store = await readLocalStore();
  const rules = (store.pricingRules || []).filter((r: any) => r.isActive !== false);

  const brands = [...new Set(rules.map((r: any) => r.brand))].sort() as string[];
  const models = rules.map((r: any) => ({
    brand: r.brand as string,
    model: r.modelPattern as string,
    basePrice: r.basePrice as number,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] to-[#06101e]">
      <PublicHeader />
      <BuybackCalculator brands={brands} models={models} />
    </div>
  );
}
