-- 12_add_platform_owner_role.sql: Add PLATFORM_OWNER to UserRole for existing DBs
DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_OWNER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
