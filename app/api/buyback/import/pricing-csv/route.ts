import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { isErpSyncEnabled, requireFeature } from "@/lib/feature-flags";
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { localId, readLocalStore, writeLocalStore } from "@/lib/local-store";

function parseCsvRow(line: string, separator: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === separator) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = parseCsvRow(lines[0], separator).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    return row;
  });
}

function pick(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && value !== "") return value;
  }
  return "";
}

export async function POST(req: Request) {
  const disabled = requireFeature(isErpSyncEnabled(), "ERP senkronizasyon modulu pasif");
  if (disabled) return disabled;

  const auth = requireRole(["ADMIN"]);
  if (auth.error) return auth.error;

  try {
    const body = await req.text();
    const rows = parseCsv(body);
    if (rows.length === 0) return fail("CSV bos veya gecersiz", "VALIDATION", 400);

    let inserted = 0;
    let updated = 0;
    let skippedNonPhone = 0;
    const errors: string[] = [];
    if (isDbDisabledMode()) {
      const store = await readLocalStore();
      for (const row of rows) {
        try {
          const category = pick(row, "kategori", "category").toLowerCase();
          if (category && category !== "telefon") {
            skippedNonPhone++;
            continue;
          }

          const brand = pick(row, "brand", "marka");
          const modelRaw = pick(row, "modelpattern", "model", "model_pattern");
          const modelPattern = modelRaw || null;
          const basePrice = Number(pick(row, "baseprice", "fiyat", "base_price"));
          const minPrice = Number(pick(row, "minprice", "min_fiyat", "min_price"));
          const questionSet = pick(row, "soru_seti", "question_set", "question_set_json");
          if (!brand || !basePrice || Number.isNaN(basePrice)) {
            errors.push(`invalid row: ${JSON.stringify(row)}`);
            continue;
          }
          const existing = store.pricingRules.find((r) => r.brand === brand && (r.modelPattern ?? null) === modelPattern);
          const data = {
            brand,
            modelPattern,
            basePrice,
            minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
            maxPrice: basePrice,
            excellentBonusPct: Number(row.excellentBonusPct || 0.2),
            goodBonusPct: Number(row.goodBonusPct || 0),
            badPenaltyPct: Number(row.badPenaltyPct || 0.2),
            batteryHighPct: Number(row.batteryHighPct || 0.08),
            batteryLowPenalty: Number(row.batteryLowPenalty || 0.18),
            brokenPenaltyPct: Number(row.brokenPenaltyPct || 0.3),
            isActive: row.isActive ? row.isActive === "true" : true,
          };
          if (existing) {
            Object.assign(existing, data);
            updated++;
          } else {
            store.pricingRules.unshift({ id: localId("rule"), ...data });
            inserted++;
          }
          if (modelPattern && questionSet) {
            const existingCatalog = (store.buybackCatalog || []).find((c) => c.brand === brand && c.model === modelPattern);
            if (existingCatalog) {
              existingCatalog.basePrice = basePrice;
              existingCatalog.minPrice = Number.isFinite(minPrice) ? minPrice : 0;
              existingCatalog.questionSetJson = questionSet;
            } else {
              store.buybackCatalog = store.buybackCatalog || [];
              store.buybackCatalog.unshift({
                id: localId("bbcat"),
                category: "telefon",
                brand,
                model: modelPattern,
                basePrice,
                minPrice: Number.isFinite(minPrice) ? minPrice : 0,
                questionSetJson: questionSet,
              });
            }
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "import row error");
        }
      }
      await writeLocalStore(store);
      return ok({ inserted, updated, skippedNonPhone, errors }, 200, "CSV import tamamlandi");
    }

    for (const row of rows) {
      try {
        const category = pick(row, "kategori", "category").toLowerCase();
        if (category && category !== "telefon") {
          skippedNonPhone++;
          continue;
        }
        const brand = pick(row, "brand", "marka");
        const modelPattern = pick(row, "modelpattern", "model", "model_pattern") || null;
        const basePrice = Number(pick(row, "baseprice", "fiyat", "base_price"));
        const minPrice = Number(pick(row, "minprice", "min_fiyat", "min_price"));
        if (!brand || !basePrice || Number.isNaN(basePrice)) {
          errors.push(`invalid row: ${JSON.stringify(row)}`);
          continue;
        }

        const existing = await prisma.offerPricingRule.findFirst({
          where: { brand, modelPattern },
        });

        const data = {
          brand,
          modelPattern,
          basePrice,
          minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
          maxPrice: basePrice,
          excellentBonusPct: Number(row.excellentBonusPct || 0.2),
          goodBonusPct: Number(row.goodBonusPct || 0),
          badPenaltyPct: Number(row.badPenaltyPct || 0.2),
          batteryHighPct: Number(row.batteryHighPct || 0.08),
          batteryLowPenalty: Number(row.batteryLowPenalty || 0.18),
          brokenPenaltyPct: Number(row.brokenPenaltyPct || 0.3),
          isActive: row.isActive ? row.isActive === "true" : true,
        };

        if (existing) {
          await prisma.offerPricingRule.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.offerPricingRule.create({ data });
          inserted++;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "import row error");
      }
    }

    await prisma.erpSyncLog.create({
      data: {
        syncType: "pricing_rules_csv",
        insertedCount: inserted,
        updatedCount: updated,
        errorCount: errors.length + skippedNonPhone,
        payloadJson: body.slice(0, 10000),
        resultJson: JSON.stringify({ inserted, updated, skippedNonPhone, errors }),
        createdByUserId: auth.user?.userId,
      },
    });

    return ok({ inserted, updated, skippedNonPhone, errors }, 200, "CSV import tamamlandi");
  } catch (error) {
    return fail(getErrorMessage(error, "CSV import hatasi"), getErrorCode(error), getErrorStatus(error));
  }
}
