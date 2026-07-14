import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { erpSyncSchema } from "@/lib/validations";
import { isErpSyncEnabled, requireFeature } from "@/lib/feature-flags";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

export async function POST(req: Request) {
  const disabled = requireFeature(isErpSyncEnabled(), "ERP senkronizasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;
  const tenantId = auth.user?.tenantId ?? null;
  if (!tenantId) return fail("Tenant baglami bulunamadi", "NOT_FOUND", 404);

  try {
    const body = await req.json();
    const parsed = erpSyncSchema.safeParse(body);
    if (!parsed.success) return fail("ERP sync payload geçersiz", "VALIDATION", 400);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      for (const rule of parsed.data.pricingRules) {
        const existing = store.pricingRules.find((r) => r.tenantId === tenantId && r.brand === rule.brand && (r.modelPattern ?? null) === (rule.modelPattern ?? null));
        if (existing) {
          existing.basePrice = rule.basePrice;
          existing.excellentBonusPct = rule.excellentBonusPct ?? existing.excellentBonusPct;
          existing.goodBonusPct = rule.goodBonusPct ?? existing.goodBonusPct;
          existing.badPenaltyPct = rule.badPenaltyPct ?? existing.badPenaltyPct;
          existing.batteryHighPct = rule.batteryHighPct ?? existing.batteryHighPct;
          existing.batteryLowPenalty = rule.batteryLowPenalty ?? existing.batteryLowPenalty;
          existing.brokenPenaltyPct = rule.brokenPenaltyPct ?? existing.brokenPenaltyPct;
          existing.isActive = rule.isActive ?? true;
          updated++;
        } else {
          store.pricingRules.unshift({
            id: localId("rule"),
            tenantId,
            brand: rule.brand,
            modelPattern: rule.modelPattern ?? null,
            basePrice: rule.basePrice,
            excellentBonusPct: rule.excellentBonusPct ?? 0.2,
            goodBonusPct: rule.goodBonusPct ?? 0,
            badPenaltyPct: rule.badPenaltyPct ?? 0.2,
            batteryHighPct: rule.batteryHighPct ?? 0.08,
            batteryLowPenalty: rule.batteryLowPenalty ?? 0.18,
            brokenPenaltyPct: rule.brokenPenaltyPct ?? 0.3,
            isActive: rule.isActive ?? true,
          });
          inserted++;
        }
      }
      await writeLocalStore(store);
      return ok({ inserted, updated, errors }, 200, "ERP senkronizasyonu tamamlandi");
    }

    for (const rule of parsed.data.pricingRules) {
      try {
        const existing = await prisma.offerPricingRule.findFirst({
          where: {
            tenantId,
            brand: rule.brand,
            modelPattern: rule.modelPattern ?? null,
          },
        });

        if (existing) {
          await prisma.offerPricingRule.update({
            where: { id: existing.id },
            data: {
              basePrice: rule.basePrice,
              excellentBonusPct: rule.excellentBonusPct ?? existing.excellentBonusPct,
              goodBonusPct: rule.goodBonusPct ?? existing.goodBonusPct,
              badPenaltyPct: rule.badPenaltyPct ?? existing.badPenaltyPct,
              batteryHighPct: rule.batteryHighPct ?? existing.batteryHighPct,
              batteryLowPenalty: rule.batteryLowPenalty ?? existing.batteryLowPenalty,
              brokenPenaltyPct: rule.brokenPenaltyPct ?? existing.brokenPenaltyPct,
              isActive: rule.isActive ?? true,
            },
          });
          updated++;
        } else {
          await prisma.offerPricingRule.create({
            data: {
              tenantId,
              brand: rule.brand,
              modelPattern: rule.modelPattern ?? null,
              basePrice: rule.basePrice,
              excellentBonusPct: rule.excellentBonusPct ?? 0.2,
              goodBonusPct: rule.goodBonusPct ?? 0,
              badPenaltyPct: rule.badPenaltyPct ?? 0.2,
              batteryHighPct: rule.batteryHighPct ?? 0.08,
              batteryLowPenalty: rule.batteryLowPenalty ?? 0.18,
              brokenPenaltyPct: rule.brokenPenaltyPct ?? 0.3,
              isActive: rule.isActive ?? true,
            },
          });
          inserted++;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "rule sync error");
      }
    }

    await prisma.erpSyncLog.create({
      data: {
        syncType: "pricing_rules",
        insertedCount: inserted,
        updatedCount: updated,
        errorCount: errors.length,
        payloadJson: JSON.stringify(parsed.data),
        resultJson: JSON.stringify({ inserted, updated, errors }),
        createdByUserId: auth.user?.userId,
      },
    });

    return ok({ inserted, updated, errors }, 200, "ERP senkronizasyonu tamamlandi");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "ERP sync hatasi", "INTERNAL", 400);
  }
}

