-- Platform-level settings storage and session revocation support.
--
-- All statements are metadata-only or create small new tables, so this is safe
-- to apply during business hours; no table rewrite and no long lock.

-- ─── Session revocation ──────────────────────────────────────────────────────
-- Bumped whenever a user's password, role or active flag changes. Middleware
-- compares it against the epoch baked into the session cookie, so an
-- already-issued token stops working instead of remaining valid for its full
-- 8-hour lifetime. Existing rows default to 0, which matches the value that
-- tokens minted before this column read as.
ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "sessionEpoch" INTEGER NOT NULL DEFAULT 0;

-- ─── Platform settings ───────────────────────────────────────────────────────
-- Studio-owned, non-tenant-scoped configuration: reseller pricing, its change
-- history, and Studio operating expenses. These previously lived only in
-- data/local-store.json, so on a serverless host every change was lost at the
-- next cold start.
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key"       TEXT NOT NULL,
  "value"     JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);
