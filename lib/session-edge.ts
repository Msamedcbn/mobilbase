/**
 * Edge-runtime session verification.
 *
 * `lib/session.ts` uses node:crypto and therefore cannot run in middleware.
 * Middleware previously just base64-decoded the cookie and trusted whatever it
 * found — role, tenantId, activeModules, the frozen-tenant check — which meant
 * every authorization decision at the edge was made on unauthenticated,
 * client-editable input. This module re-implements the same HMAC check with Web
 * Crypto so middleware verifies before it trusts.
 *
 * Must stay byte-compatible with createSignedSessionToken in lib/session.ts:
 * `base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, encodedBody))`.
 */

export type EdgeSessionPayload = {
  userId?: string;
  email?: string;
  role?: string;
  fullName?: string;
  tenantId?: string | null;
  expiresAt?: number;
  rolePermissions?: Record<string, string[]>;
  activeModules?: Record<string, boolean>;
  isTrial?: boolean;
  trialExpiresAt?: string;
  sessionEpoch?: number;
};

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-session-secret";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Constant-time comparison so the check does not leak the expected signature. */
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Returns the payload only when the signature is valid and the session has not
 * expired. Returns null for anything else — malformed, forged, or stale.
 */
export async function verifySessionTokenEdge(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const [encodedBody, signature] = token.split(".");
    if (!encodedBody || !signature) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedBody));
    const expected = bytesToBase64Url(new Uint8Array(mac));

    if (!timingSafeEqual(signature, expected)) return null;

    const parsed = JSON.parse(base64UrlToUtf8(encodedBody)) as EdgeSessionPayload;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
