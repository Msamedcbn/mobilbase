import { fail } from "@/lib/api-response";

function envFlag(name: string, defaultValue = false) {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

export function isBuybackOpsEnabled() {
  return envFlag("BUYBACK_NEW_OPS_ENABLED", false);
}

export function isReconciliationEnabled() {
  return envFlag("BUYBACK_RECONCILIATION_ENABLED", false);
}

export function isErpSyncEnabled() {
  return envFlag("BUYBACK_ERP_SYNC_ENABLED", false);
}

export function isBuybackBackofficeEnabled() {
  return envFlag("BUYBACK_BACKOFFICE_ENABLED", false);
}

export function isBuybackBackofficeAdminOnly() {
  return envFlag("BUYBACK_BACKOFFICE_ADMIN_ONLY", false);
}

export function requireFeature(enabled: boolean, message: string) {
  if (enabled) return null;
  return fail(message, "FORBIDDEN", 403);
}
