-- Add fields for single active non-admin session validation
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "activeSessionVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "activeDeviceSecretHash" TEXT;

