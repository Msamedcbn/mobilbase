-- Add tenant scoping to AppUser for multi-tenant isolation
ALTER TABLE "AppUser"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AppUser_tenantId_fkey'
  ) THEN
    ALTER TABLE "AppUser"
      ADD CONSTRAINT "AppUser_tenantId_fkey"
      FOREIGN KEY ("tenantId")
      REFERENCES "Customer"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AppUser_tenantId_idx" ON "AppUser"("tenantId");

-- Backfill likely owner users by matching Customer.email
UPDATE "AppUser" u
SET "tenantId" = c.id
FROM "Customer" c
WHERE u."tenantId" IS NULL
  AND c.email IS NOT NULL
  AND lower(u.email) = lower(c.email);
