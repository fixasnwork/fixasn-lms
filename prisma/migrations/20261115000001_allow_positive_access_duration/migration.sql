-- Replace fixed option lists without changing existing package/payment data.
-- A separate migration also supports databases where the original was applied.
BEGIN;

ALTER TABLE "packages" DROP CONSTRAINT "packages_accessDurationMonths_check";
ALTER TABLE "packages" ADD CONSTRAINT "packages_accessDurationMonths_check"
  CHECK ("accessDurationMonths" > 0);

ALTER TABLE "payments" DROP CONSTRAINT "payments_accessDurationMonths_check";
ALTER TABLE "payments" ADD CONSTRAINT "payments_accessDurationMonths_check"
  CHECK ("accessDurationMonths" IS NULL OR "accessDurationMonths" > 0);

COMMIT;
