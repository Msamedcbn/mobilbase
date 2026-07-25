export type BootstrapStatus = {
  ok: boolean;
  missing: string[];
};

const REQUIRED_ENV = ["DATABASE_URL", "APP_BASE_URL"] as const;

/**
 * Secrets that must be explicitly configured in production.
 *
 * Both lib/session.ts and lib/session-edge.ts fall back to a hard-coded
 * "dev-session-secret" when SESSION_SECRET is unset. That fallback is fine
 * locally, but in production it means anyone who reads the source can mint a
 * valid PLATFORM_OWNER cookie — so readiness fails loudly instead of serving
 * traffic with a guessable signing key.
 */
const REQUIRED_PROD_SECRETS = ["SESSION_SECRET"] as const;

function isSet(key: string) {
  const value = process.env[key];
  return Boolean(value && value.trim().length > 0);
}

export function getBootstrapStatus(): BootstrapStatus {
  const dbDisabled = (process.env.DB_DISABLED_MODE ?? "false").toLowerCase() === "true";
  const required = dbDisabled ? REQUIRED_ENV.filter((k) => k !== "DATABASE_URL") : REQUIRED_ENV;
  const missing: string[] = required.filter((key) => !isSet(key));

  if (process.env.NODE_ENV === "production") {
    for (const key of REQUIRED_PROD_SECRETS) {
      if (!isSet(key)) missing.push(key);
    }
    // A placeholder left over from .env.example is as bad as an unset value.
    if (isSet("SESSION_SECRET") && process.env.SESSION_SECRET === "change-me-long-random-secret") {
      missing.push("SESSION_SECRET (placeholder value)");
    }
  }

  return { ok: missing.length === 0, missing: [...missing] };
}
