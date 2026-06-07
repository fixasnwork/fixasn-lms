## Why

Packages and tryouts are currently always-available (gated only by the `isActive` boolean). The product needs scheduled exam windows — e.g., a "June 2026 SKD Tryout" package that opens on June 1 and closes on June 30, with a matching window on the tryouts inside it. Without per-row date periods, admins have no way to express a time-boxed offering.

Additionally, the tryout-attempt entry point (`POST /api/tryout-attempts`) does not currently check `isActive` at all, which means an admin-toggled-off package can still be taken. The date period work is a natural moment to fix that gap.

## What Changes

- **New columns** on `Package` and `Tryout`: `startDate DateTime?` and `endDate DateTime?` (nullable `Timestamptz(6)`).
- **Remove `isActive`** column from `Package`. Status derived entirely from dates: both null = inactive; startDate ≤ now + (endDate null or > now) = active; startDate > now = scheduled; endDate ≤ now = expired.
- **Migration** adds date columns, backfills existing active packages with `startDate = createdAt` (endDate stays null = active indefinitely), then drops `isActive`.
- **API surface** — `POST/PUT` for packages and tryouts accept and return the date fields. Both fields optional (default null). Validation: `startDate < endDate` when both set. `isActive` removed from Package API response.
- **Admin UI** — Date inputs for Package and Tryout forms (both optional). Status indicator (Active/Scheduled/Expired/Inactive) shown per entity.
- **User-facing filter** — Listings filter on `isAvailable()` (date-only, no isActive).
- **Attempt gate** — `POST /api/tryout-attempts` validates tryout and parent packages are Active via `isAvailable()`. In-progress attempts NOT voided. HTTP 403 on failure.
- **AND semantics** — for the attempt gate: a tryout is startable only when **both** its own window AND every package date window it belongs to is open. If a tryout is in multiple packages, all package date windows must be open.
- **Null semantics** — `startDate` or `endDate` null = "not scheduled" for both packages and tryouts.
- **Trial packages** — same date semantics as paid packages. `isTrial` is an independent flag, not a different scheduling model.

## Capabilities

### New Capabilities

- `package-date-period`: Package-level scheduling. `isActive` column removed; status derived from nullable `startDate`/`endDate`. Active = startDate ≤ now + (endDate null or > now). Admin UI shows status indicator.
- `tryout-date-period`: Tryout-level scheduling. Same date-only semantics as packages.
- `tryout-attempt-availability`: Combined availability gate at attempt start. A tryout is startable only when Active AND all parent packages are Active. In-progress attempts are not affected.

### Modified Capabilities

_None — no existing spec covers scheduled availability or the attempt gate._

## Impact

- **Code:**
  - `prisma/schema.prisma` — new columns on `Package` and `Tryout`
  - `lib/types.ts` — extend `Package` and `Tryout` interfaces
  - `app/api/packages/route.ts`, `app/api/packages/[id]/route.ts` — accept/return dates
  - `app/api/tryouts/route.ts`, `app/api/tryouts/[id]/route.ts` — accept/return dates
  - `app/api/tryout-attempts/route.ts` — add availability gate (and `isActive` check that was missing)
  - `hooks/useTryoutQueries.ts` — `useCreatePackage`/`useUpdatePackage`/`useCreateTryout`/`useUpdateTryout` signatures
  - `app/admin/settings/page.tsx` — add date inputs to Package and Tryout forms
  - `app/(user)/buy/page.tsx`, `components/dashboard/DashboardHomeClient.tsx` — replace `isActive` filter with availability check
  - `lib/availability.ts` (new) — shared `isAvailable(entity, now)` helper
  - Test files: `app/api/packages/route.test.ts`, `app/api/tryouts/route.test.ts`, new `app/api/tryout-attempts/route.test.ts` (or extend), `lib/availability.test.ts` (new)

- **DB:** One Prisma migration. Backfill script in migration.

- **APIs:** `POST/PUT /api/packages`, `POST/PUT /api/tryouts` gain `startDate`/`endDate`. Package create/update requires a complete date range; tryouts keep optional `endDate`. `POST /api/tryout-attempts` gains a 403 response shape for unavailability.

- **UX:** Admin settings page gets required date inputs per Package and date inputs per Tryout. User buy page and dashboard teaser now hide packages whose explicit date range is not currently open.

- **Risk:**
  - Migration: dropping `isActive` is irreversible without re-adding the column. Mitigated by backfilling dates from existing active rows first.
  - Attempt gate: a buggy gate could lock out currently-paying users. Mitigated by feature flag in the API (env var) and rollback path = revert the gate only.
  - Time zones: cross-TZ users may see slightly different "available" windows depending on server clock. Acceptable for an Indonesian product (single TZ audience).
