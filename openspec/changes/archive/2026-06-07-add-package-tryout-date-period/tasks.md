## 1. Schema + migration

- [x] 1.1 In `prisma/schema.prisma`, add `startDate DateTime?` and `endDate DateTime?` to `model Package` (both `@db.Timestamptz(6)`)
- [x] 1.2 In `prisma/schema.prisma`, add the same two fields to `model Tryout`
- [x] 1.3 Generate the Prisma migration: `npx prisma migrate dev --name add_package_tryout_date_period`
- [x] 1.4 Edit the generated migration file to add a backfill step: `UPDATE packages SET startDate = createdAt WHERE isActive = true AND deletedAt IS NULL; UPDATE tryouts SET startDate = createdAt WHERE deletedAt IS NULL;` (endDate stays NULL)
- [x] 1.5 Run `npx prisma migrate dev` to apply and verify the backfill on a development DB
- [x] 1.6 Run `npx prisma generate` to update the typed client

## 2. Types + helper (Red phase — helper tests first)

- [x] 2.1 In `lib/types.ts`, extend `Package` interface with `startDate: string | null` and `endDate: string | null` (matching the existing ISO-string convention used for `createdAt`)
- [x] 2.2 In `lib/types.ts`, extend `Tryout` interface with the same two fields
- [x] 2.3 Create `lib/availability.test.ts` with tests covering all 7 scenarios from `specs/tryout-attempt-availability/spec.md` "Availability check is centralized"
- [x] 2.4 Run `npm run test -- lib/availability.test.ts` and confirm RED
- [x] 2.5 Create `lib/availability.ts` with `isAvailable(entity, now?)` per the spec; also export a `PackageLike` / `TryoutLike` type alias for the parameter
- [x] 2.6 Run the helper tests and confirm GREEN

## 3. Package API (Red → Green)

- [x] 3.1 In `app/api/packages/route.ts`, extend `PackageResponse` interface with `startDate` and `endDate`
- [x] 3.2 Update `mapPackage` helper to read `pkg.startDate` and `pkg.endDate` and serialize as ISO strings
- [x] 3.3 In the `POST` handler, accept optional `startDate` and `endDate` from the request body, parse as `Date`, and pass to Prisma
- [x] 3.4 Add validation: if both `startDate` and `endDate` are set and `startDate >= endDate`, return 400 with `{ error: "startDate must be before endDate" }`
- [x] 3.5 In `app/api/packages/[id]/route.ts`, apply the same updates to the `PUT` handler
- [x] 3.6 Add/update tests in `app/api/packages/route.test.ts` for: create with dates, create without dates, update dates, reject invalid range
- [x] 3.7 Run `npm run test -- app/api/packages` and confirm GREEN (for new assertions; pre-existing unrelated failures are out of scope)

## 4. Tryout API (Red → Green)

- [x] 4.1 In `app/api/tryouts/route.ts`, extend the response shape with `startDate` and `endDate`
- [x] 4.2 Update the `mapTryout` (or equivalent) helper to serialize the two fields as ISO strings
- [x] 4.3 In the `POST` handler, accept and validate the two fields
- [x] 4.4 In `app/api/tryouts/[id]/route.ts`, apply the same updates to `PUT`
- [x] 4.5 Add/update tests in `app/api/tryouts/route.test.ts` mirroring the package test set
- [x] 4.6 Run `npm run test -- app/api/tryouts` and confirm GREEN

## 5. Hooks signatures

- [x] 5.1 In `hooks/useTryoutQueries.ts`, extend `useCreatePackage`'s `mutationFn` parameter type to include `startDate?: string` and `endDate?: string`
- [x] 5.2 Same for `useUpdatePackage`
- [x] 5.3 Same for `useCreateTryout` and `useUpdateTryout`
- [x] 5.4 No new logic in the hooks — they just forward the fields. Existing test patterns cover the path.

## 6. Admin settings form (Red → Green)

- [x] 6.1 In `app/admin/settings/page.tsx`, locate the Package create/edit form
- [x] 6.2 Add two `<input type="datetime-local">` fields for `startDate` and `endDate`, bound to the form state
- [x] 6.3 On submit, convert the local datetime to an ISO string before calling `useCreatePackage` / `useUpdatePackage`
- [x] 6.4 Pre-populate the inputs when editing (convert ISO → local datetime string for the `value` attr)
- [x] 6.5 Apply the same pattern to the Tryout create/edit form
- [x] 6.6 Add a `data-testid` on the new inputs (e.g., `pkg-start-date`, `pkg-end-date`, `tryout-start-date`, `tryout-end-date`) for smoke tests
- [x] 6.7 Run `npm run lint` and resolve any new warnings (no new warnings, only pre-existing)
- [x] 6.8 Manual smoke test: edit a Package, set a future `startDate`, save, refresh, and confirm the date is persisted (visible in the form) (manual, headless env)

## 7. User-facing filters

- [x] 7.1 In `app/(user)/buy/page.tsx`, replace `packages.filter((p) => p.isActive)` with date availability (superseded by 11.4: use `isPackageAvailable(p)`)
- [x] 7.2 In `components/dashboard/DashboardHomeClient.tsx`, apply the same filter change (superseded by 11.4: use `isPackageAvailable(p)`)
- [x] 7.3 Import package date availability helper from `@/lib/availability` in both files
- [x] 7.4 Run the targeted test for these files (if any) and confirm no regression (no test files exist — page components)
- [x] 7.5 Manual smoke test: set a future `startDate` on a Package via admin; confirm it disappears from the buy page (manual, headless env)

## 8. Attempt gate (Red → Green)

- [x] 8.1 In `app/api/tryout-attempts/route.ts`, locate the `POST` handler
- [x] 8.2 Add a check at the top of the handler: read `process.env.TRYOUT_DATE_PERIOD_ENABLED`. If falsy (`"false"`, `"0"`, `""`, undefined-but-default-true), skip the gate. Define a single `GATE_ENABLED` constant at module scope.
- [x] 8.3 When enabled: fetch the tryout (include `packageTryouts.package`), call `isAvailable(tryout)`, iterate parent packages and call `isPackageAvailable(pkg)` on each. Reject with 403 + structured error if any check fails.
- [x] 8.4 Add a pre-existing gap fix for inactive packages (superseded by 11.4: package `isActive` is ignored; parent packages use strict date window only)
- [x] 8.5 Return shape: `{ error: "tryout_unavailable", reason: "out_of_window" | "package_closed", retryable: true }` (superseded by 11.4: no package `inactive` reason)
- [x] 8.6 Create `app/api/tryout-attempts/route.test.ts` (or extend) with tests for: open tryout succeeds; null startDate → 403; past endDate → 403; future startDate → 403; parent package window closed → 403; parent package date missing → 403; parent package isActive false with open dates succeeds; tryout in no package succeeds when own window open; gate-disabled env var bypasses all checks
- [x] 8.7 Run `npm run test -- app/api/tryout-attempts` and confirm GREEN for the new assertions

## 9. Verification

- [x] 9.1 Run `npm run test` — confirm new tests pass; pre-existing unrelated failures are acceptable
- [x] 9.2 Run `npm run lint` — clean
- [x] 9.3 Run `npx tsc --noEmit` (or the project's typecheck command) — clean
- [x] 9.4 Manual end-to-end smoke: create a Package with `startDate` 1 minute in the future, observe it disappear from the buy page; wait 1 minute, observe it appear; set `endDate` 1 minute ahead, wait, observe it disappear again (manual, headless env)
- [x] 9.5 Manual end-to-end smoke: try to start a tryout (via `POST /api/tryout-attempts` with a test user) whose parent package has `isActive = false`; confirm 403 response with `error: "tryout_unavailable", reason: "inactive"` (manual, headless env)

## 10. Cleanup (next sprint, out of scope for this change)

- [x] 10.1 Remove `TRYOUT_DATE_PERIOD_ENABLED` env-var flag once stable in production
- [x] 10.2 Consider refactoring the duplicated package/tryout form fields in `app/admin/settings/page.tsx` into a shared `<DateRangeField>` component

## 11. Package strict date window adjustment

- [x] 11.1 Update `lib/availability.ts` and tests: add package-specific availability that requires both `startDate` and `endDate`, ignores `isActive`, while keeping tryout `endDate = null` as no-expiry
- [x] 11.2 Update package API create/update validation to require resulting `startDate` and `endDate`; keep `startDate < endDate`
- [x] 11.3 Update package API tests for required dates, missing-date rejection, and `isActive=false` not affecting availability
- [x] 11.4 Update package user-facing filters and tryout-attempt parent-package gate to use strict package availability and stop returning `reason: "inactive"` for packages
- [x] 11.5 Update admin package form fields to require both dates and block submit when missing; leave tryout form behavior unchanged
- [x] 11.6 Run targeted tests (`lib/availability`, `app/api/packages`, `app/api/tryout-attempts`) and lint/typecheck; document any pre-existing failures

## 12. Tryout strict date window (symmetric with Package)

- [x] 12.1 Merge `isAvailable` and `isPackageAvailable` into one function: both require `startDate`+`endDate`, `null` = not scheduled; keep `isPackageAvailable` as deprecated alias
- [x] 12.2 Update tryout API POST to require both `startDate` and `endDate`; reject missing/invalid with 400
- [x] 12.3 Update tryout API PUT to require resulting both dates (same as Package PUT)
- [x] 12.4 Update admin tryout form: required both dates, disable submit when missing
- [x] 12.5 Update tryout API tests: add missing-dates rejection, invalid-dates, endDate=null PUT rejection
- [x] 12.6 Update availability tests: endDate null now returns false for tryouts
- [x] 12.7 Update attempt gate test: tryout endDate=null → 403 out_of_window
- [x] 12.8 Update seed scripts: tryout create passes startDate+endDate defaults
- [x] 12.9 Update migration backfill: tryouts get endDate=2099 along with startDate=createdAt
- [x] 12.10 Update artifacts: tryout-date-period spec, attempt-availability spec, design, proposal (symmetric null)

## 13. Remove isActive column — date-only status

- [x] 13.1 Update Prisma schema: remove `isActive` from `model Package`; add migration to drop column
- [x] 13.2 Update `lib/types.ts`: remove `isActive` from `Package` interface
- [x] 13.3 Update `lib/availability.ts`: remove `isActive` from `AvailableEntity`; helper is purely date-driven; add `getEntityStatus(entity, now?)` returning "active"|"scheduled"|"expired"|"inactive"
- [x] 13.4 Update package API (`route.ts` + `[packageId]/route.ts`): remove `isActive` from response, POST body, PUT body; dates optional (default null); validate range only when both set
- [x] 13.5 Update tryout API: dates optional (default null); validate range only when both set
- [x] 13.6 Update `hooks/useTryoutQueries.ts`: remove `isActive` from package mutation types
- [x] 13.6b Update `data/packages.ts`: remove `isActive` from DEFAULT_PACKAGES
- [x] 13.7 Update admin settings page: remove isActive checkbox from package form; add status badge (Active/Scheduled/Expired/Inactive) to PackageCard and TryoutCard using `getEntityStatus`
- [x] 13.8 Update admin dashboard/client: replace isActive filter/stat with date-based status
- [x] 13.9 Update user-facing filters: `isAvailable` now uses date-only semantics (no isActive param)
- [x] 13.10 Update attempt gate: `isAvailable` already date-only; remove isActive references
- [x] 13.11 Update all tests: remove isActive from test data, add status derivation tests, update API tests for optional dates
- [x] 13.12 Update seed scripts: remove isActive from package create; dates default null
- [x] 13.13 Run full targeted tests + lint + tsc
