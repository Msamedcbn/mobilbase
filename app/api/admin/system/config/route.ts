import { requireRole } from "@/lib/auth";
import { ok } from "@/lib/api-response";
import { getBootstrapStatus } from "@/lib/config";
import { isBuybackBackofficeAdminOnly, isBuybackBackofficeEnabled, isBuybackOpsEnabled, isErpSyncEnabled, isReconciliationEnabled } from "@/lib/feature-flags";

export async function GET() {
  const auth = requireRole(["ADMIN", "MANAGER"]);
  if (auth.error) return auth.error;

  const smtpReady = Boolean(
    process.env.SMTP_ENABLED?.toLowerCase() === "true" &&
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_FROM,
  );

  return ok({
    tenant: {
      name: process.env.TENANT_NAME ?? "VibeGSM",
      appBaseUrl: process.env.APP_BASE_URL ?? null,
    },
    bootstrap: getBootstrapStatus(),
    featureFlags: {
      buybackNewOps: isBuybackOpsEnabled(),
      buybackReconciliation: isReconciliationEnabled(),
      buybackErpSync: isErpSyncEnabled(),
      buybackBackoffice: isBuybackBackofficeEnabled(),
      buybackBackofficeAdminOnly: isBuybackBackofficeAdminOnly(),
    },
    smtp: {
      enabled: process.env.SMTP_ENABLED?.toLowerCase() === "true",
      ready: smtpReady,
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 0),
      from: process.env.SMTP_FROM ?? "",
    },
  });
}
