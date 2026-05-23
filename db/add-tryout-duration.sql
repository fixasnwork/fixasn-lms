-- Add per-tryout duration support for existing databases.
ALTER TABLE "tryouts"
  ADD COLUMN IF NOT EXISTS "durationMin" INTEGER NOT NULL DEFAULT 100;

UPDATE "tryouts"
SET "durationMin" = 15
WHERE "isTrial" = true;
