import { PLATFORM_KEYS, readPlatformSetting, writePlatformSetting } from "@/lib/platform-settings";
import crypto from "node:crypto";

/**
 * Studio-managed marketing campaigns (site banners/popups) and referral codes.
 * Platform-wide, not tenant-scoped — stored via the same PlatformSetting-backed
 * key/value store as reseller pricing, so it works in both DB and DB-disabled mode.
 */

export type CampaignPlacement = "banner" | "modal";

export interface MarketingCampaign {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  ctaHref: string;
  placement: CampaignPlacement;
  isActive: boolean;
  /** ISO date strings. Null means no bound on that side. */
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReferralDiscountType = "percent" | "fixed";

export interface ReferralCode {
  id: string;
  code: string;
  ownerName: string;
  discountType: ReferralDiscountType;
  discountValue: number;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function listCampaigns(): Promise<MarketingCampaign[]> {
  return readPlatformSetting<MarketingCampaign[]>(PLATFORM_KEYS.marketingCampaigns, []);
}

export async function saveCampaigns(list: MarketingCampaign[]): Promise<void> {
  await writePlatformSetting(PLATFORM_KEYS.marketingCampaigns, list);
}

/** Whether a campaign should currently be shown to visitors. */
export function isCampaignLive(c: MarketingCampaign, now = Date.now()): boolean {
  if (!c.isActive) return false;
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return false;
  return true;
}

export async function listReferralCodes(): Promise<ReferralCode[]> {
  return readPlatformSetting<ReferralCode[]>(PLATFORM_KEYS.referralCodes, []);
}

export async function saveReferralCodes(list: ReferralCode[]): Promise<void> {
  await writePlatformSetting(PLATFORM_KEYS.referralCodes, list);
}

export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function isReferralCodeUsable(code: ReferralCode): boolean {
  if (!code.isActive) return false;
  if (code.usageLimit !== null && code.usageCount >= code.usageLimit) return false;
  return true;
}

/**
 * Looks up a code and, if usable, atomically increments its usage count.
 * Returns the code as it was *before* incrementing (so callers get accurate
 * discount info) or null if the code doesn't exist or can't be used anymore.
 */
export async function findAndConsumeReferralCode(rawCode: string): Promise<ReferralCode | null> {
  const normalized = normalizeReferralCode(rawCode);
  if (!normalized) return null;

  const codes = await listReferralCodes();
  const idx = codes.findIndex((c) => c.code === normalized);
  if (idx === -1) return null;

  const found = codes[idx];
  if (!isReferralCodeUsable(found)) return null;

  const snapshot = { ...found };
  codes[idx] = { ...found, usageCount: found.usageCount + 1, updatedAt: new Date().toISOString() };
  await saveReferralCodes(codes);
  return snapshot;
}
