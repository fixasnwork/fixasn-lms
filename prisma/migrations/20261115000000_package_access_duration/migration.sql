-- Existing packages receive one year; new packages default to one month.
ALTER TABLE "packages" ADD COLUMN "accessDurationMonths" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "packages" ALTER COLUMN "accessDurationMonths" SET DEFAULT 1;
ALTER TABLE "packages" ADD CONSTRAINT "packages_accessDurationMonths_check"
  CHECK ("accessDurationMonths" IN (1, 3, 12));

ALTER TABLE "payments"
  ADD COLUMN "accessDurationMonths" INTEGER,
  ADD COLUMN "verifiedAt" TIMESTAMPTZ(6),
  ADD COLUMN "accessExpiresAt" TIMESTAMPTZ(6);
ALTER TABLE "payments" ADD CONSTRAINT "payments_accessDurationMonths_check"
  CHECK ("accessDurationMonths" IS NULL OR "accessDurationMonths" IN (1, 3, 12));

-- Preserve the old end date for purchases that were already verified.
-- A legacy package without an end date keeps NULL expiry.
UPDATE "payments" AS payment
SET "accessExpiresAt" = package."endDate"
FROM "packages" AS package
WHERE payment."packageId" = package.id AND payment.status = 'verified';

-- Existing pending payments use the package duration when first verified.
CREATE INDEX "payments_userId_status_accessExpiresAt_idx"
  ON "payments" ("userId", "status", "accessExpiresAt");
