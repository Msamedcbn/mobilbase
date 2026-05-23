-- 11_expand_userrole_enum.sql: Add MANAGER and ACCOUNTANT to UserRole for existing DBs
DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
