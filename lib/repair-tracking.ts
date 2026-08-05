import crypto from "node:crypto";

function getTrackingSecret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-session-secret";
}

/**
 * Deterministic HMAC token bound to a single repair id — no storage needed,
 * verifiable by recomputing it. Lets a public /servis/[id] link stay valid
 * indefinitely without a DB column, while an id alone (no token) is not enough
 * to read someone else's repair.
 */
export function createRepairTrackingToken(repairId: string): string {
  return crypto
    .createHmac("sha256", getTrackingSecret())
    .update(`repair-tracking:${repairId}`)
    .digest("base64url")
    .slice(0, 22);
}

export function verifyRepairTrackingToken(repairId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = createRepairTrackingToken(repairId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
