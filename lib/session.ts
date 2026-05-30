import crypto from "node:crypto";

export type SessionPayload = {
  userId: string;
  email: string;
  role: "PLATFORM_OWNER" | "ADMIN" | "CASHIER" | "TECHNICIAN" | "MANAGER" | "ACCOUNTANT";
  fullName: string;
  tenantId?: string | null;
  expiresAt: number;
  rolePermissions?: Record<string, string[]>;
  activeModules?: Record<string, boolean>;
};

function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-session-secret";
}

function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createSignedSessionToken(payload: SessionPayload) {
  const body = JSON.stringify(payload);
  const encodedBody = toBase64Url(body);
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(encodedBody).digest("base64url");
  return `${encodedBody}.${signature}`;
}

export function verifySignedSessionToken(token: string): SessionPayload | null {
  try {
    const [encodedBody, signature] = token.split(".");
    if (!encodedBody || !signature) return null;

    const expected = crypto.createHmac("sha256", getSessionSecret()).update(encodedBody).digest("base64url");
    const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) return null;

    const parsed = JSON.parse(fromBase64Url(encodedBody)) as SessionPayload;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
