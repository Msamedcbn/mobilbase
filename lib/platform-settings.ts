import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isDbDisabledMode } from "@/lib/runtime-mode";
import { readLocalStore, writeLocalStore, type LocalStore } from "@/lib/local-store";

/**
 * Platform-wide settings owned by the Studio, not by any tenant.
 *
 * Backed by the PlatformSetting table when a database is configured, and by the
 * local JSON store in DB-disabled mode. The Studio pricing and expense routes
 * used to write straight to the JSON file in every mode, which meant on a
 * serverless host the platform owner's pricing changes silently reverted at the
 * next cold start.
 */

export const PLATFORM_KEYS = {
  resellerPricing: "resellerPricing",
  resellerPricingHistory: "resellerPricingHistory",
  resellerExpenses: "resellerExpenses",
} as const;

export type PlatformKey = (typeof PLATFORM_KEYS)[keyof typeof PLATFORM_KEYS];

export async function readPlatformSetting<T>(key: PlatformKey, fallback: T): Promise<T> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    const value = (store as unknown as Record<string, unknown>)[key];
    return (value as T) ?? fallback;
  }

  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function writePlatformSetting<T>(key: PlatformKey, value: T): Promise<void> {
  if (isDbDisabledMode()) {
    const store = await readLocalStore();
    (store as unknown as Record<string, unknown>)[key] = value;
    await writeLocalStore(store as LocalStore);
    return;
  }

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: value as Prisma.InputJsonValue },
    create: { key, value: value as Prisma.InputJsonValue },
  });
}
