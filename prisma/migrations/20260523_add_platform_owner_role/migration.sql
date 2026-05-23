-- Add PLATFORM_OWNER to UserRole enum for existing databases
DO $$
BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_OWNER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
