-- Expand UserRole enum for existing databases
DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
