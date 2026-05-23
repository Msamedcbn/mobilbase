export type BootstrapStatus = {
  ok: boolean;
  missing: string[];
};

const REQUIRED_ENV = ["DATABASE_URL", "APP_BASE_URL"] as const;

export function getBootstrapStatus(): BootstrapStatus {
  const dbDisabled = (process.env.DB_DISABLED_MODE ?? "false").toLowerCase() === "true";
  const required = dbDisabled ? REQUIRED_ENV.filter((k) => k !== "DATABASE_URL") : REQUIRED_ENV;
  const missing = required.filter((key) => !(process.env[key] && process.env[key]!.trim().length > 0));
  return { ok: missing.length === 0, missing: [...missing] };
}
