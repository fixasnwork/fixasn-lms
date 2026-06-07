-- Backfill: preserve existing visibility — set startDate from createdAt for non-deleted packages
UPDATE "packages"
SET    "startDate" = COALESCE("startDate", "createdAt")
WHERE  "startDate" IS NULL
  AND  "deletedAt" IS NULL;

-- Drop the isActive column
ALTER TABLE "packages" DROP COLUMN "isActive";
