-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "startDate" TIMESTAMPTZ(6),
ADD COLUMN     "endDate" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "tryouts" ADD COLUMN     "startDate" TIMESTAMPTZ(6),
ADD COLUMN     "endDate" TIMESTAMPTZ(6);

-- Backfill: existing isActive rows get an explicit package window so current visible packages remain visible.
-- Inactive rows stay NULL/NULL and remain unscheduled until an admin sets dates.
UPDATE "packages"
SET    "startDate" = COALESCE("startDate", "createdAt"),
       "endDate" = COALESCE("endDate", TIMESTAMPTZ '2099-12-31 23:59:59+00')
WHERE  "isActive" = true
  AND  "deletedAt" IS NULL;

UPDATE "tryouts"
SET    "startDate" = COALESCE("startDate", "createdAt"),
       "endDate" = COALESCE("endDate", TIMESTAMPTZ '2099-12-31 23:59:59+00')
WHERE  "deletedAt" IS NULL;
