## Context

`Package` and `Tryout` are Prisma models. `Package` originally had an `isActive` boolean for visibility; `Tryout` had no such field. The product needs scheduled exam windows — per-row `startDate`/`endDate` fields that control availability without a separate boolean flag.

The `isActive` column on `Package` is being removed. Both models derive status entirely from dates:
- Both null → **Inactive**
- `startDate` set and `> now` → **Scheduled**
- `startDate` set and `≤ now`, `endDate` null or `> now` → **Active**
- `endDate` set and `≤ now` → **Expired**

A single `isAvailable(entity, now?)` helper returns `true` iff Active. Admin UI shows status indicators (Active/Scheduled/Expired/Inactive).

## Goals / Non-Goals

**Goals:**
- Add `startDate`/`endDate` to `Package` and `Tryout` with safe migration.
- Remove `isActive` column from `Package` — derive status from dates only.
- Enforce availability at three points: user-facing listings, attempt creation, admin status display.
- Centralize the availability rule in a single helper (`isAvailable`).
- Both fields nullable: null = not scheduled; startDate null + endDate set = scheduled/expired; startDate set + endDate null = active indefinitely.
- Admin UI shows status indicator (Active/Scheduled/Expired/Inactive) derived from dates.
- Tests at the helper, API, and integration levels.

**Non-Goals:**
- No retroactive voiding of in-progress attempts.
- No new model for "scheduled campaigns" — date fields on existing rows are sufficient.
- No timezone picker in admin UI; we use the browser's local TZ (single audience product).
- No cron/background job to flip `isActive` based on dates — `isActive` stays a manual override.
- No refund/notification flow when a tryout window closes mid-attempt.

## Decisions

### Decision 1: `lib/availability.ts` shared helper

**Choice:** A single exported function:

```ts
type Schedulable = { isActive: boolean; startDate: Date | null; endDate: Date | null };
export function isAvailable(e: Schedulable, now: Date = new Date()): boolean {
  if (!e.isActive) return false;
  if (e.startDate === null || e.endDate === null) return false; // null = not scheduled
  return e.startDate <= now && now <= e.endDate;
}
```

**Why:** Three call sites (buy page, dashboard, attempt gate) and a future admin preview will all need the same logic. Centralizing eliminates drift and gives a single testable function.

**Alternatives considered:**
- *Inline the check at each call site* — DRY violation, easy to forget at the new attempt gate.
- *A Prisma middleware that auto-filters* — magic, hard to debug, doesn't help with the attempt gate which is per-row.

### Decision 2: `null = not scheduled` (strict)

**Choice:** Either `startDate` or `endDate` being `null` means "not scheduled" → `isAvailable` returns `false`.

**Why:** Picked by user. Forces admins to make an explicit scheduling decision for every active package/tryout. The only way to express "always available" is to set `startDate` to a past timestamp and `endDate` to a far-future timestamp (or `null` if "indefinitely scheduled" is preferred — but under strict semantics, that means "indefinitely not scheduled" which is the trap; document in the admin form).

**Migration handles it:** existing `isActive = true` rows get backfilled to `(createdAt, null)`. So today they are "scheduled from creation onwards, no end". `endDate = null` is a permanent "no end date" under strict semantics — which is the only sensible interpretation for that one field. (`startDate = null` is unambiguously "not scheduled".)

**Actually — re-evaluating the symmetry:**

The strict reading of "null = not scheduled" requires BOTH to be set. But "no end date" is a real, common need (a package that's always available after launch). So:
- `startDate = null` → **not scheduled** (must be set)
- `endDate = null` → **no expiry** (acceptable)

This is asymmetric but matches user intent. **Adopting this in the spec.** The helper becomes:

```ts
if (e.startDate === null) return false;     // never started → not scheduled
if (e.endDate === null) return e.startDate <= now; // no end date → from startDate onwards
return e.startDate <= now && now <= e.endDate;
```

**Alternatives considered:**
- *Both null = not scheduled* (the strict-symmetric version) — would force every package to have an explicit end date. Annoying.
- *Both null = always available* (loose) — would break the "not scheduled" semantic for new packages.

### Decision 3: AND of tryout and ALL parent packages

**Choice:** A tryout is startable iff: tryout.isAvailable AND for every package P such that `PackageTryout(P, T)` exists, P.isAvailable.

**Why:** Picked by user. Matches the mental model "if I bought package P which contains tryout T, and P is currently in window, and T is in window, I can take T."

**Query shape:** The attempt gate needs to know which packages a tryout belongs to. Fetch `packageTryouts` (already a Prisma relation on `Tryout`) and iterate. For small package counts per tryout (typically 1–3), this is fine. If a tryout ever belongs to many packages, the loop is still O(small).

**Alternatives considered:**
- *OR semantics* — looser; user explicitly rejected.
- *Tryout-wins or package-wins* — user explicitly rejected.
- *Precompute "in some open package" at tryout-list time and store it* — over-engineering; the check is cheap.

### Decision 4: Backfill in the Prisma migration

**Choice:** The migration file contains a `prisma.executeRaw` step that runs:

```sql
UPDATE "packages" SET "startDate" = "createdAt", "endDate" = NULL
  WHERE "isActive" = true AND "deletedAt" IS NULL;
UPDATE "tryouts" SET "startDate" = "createdAt", "endDate" = NULL
  WHERE "deletedAt" IS NULL;
```

(Tryouts don't have `isActive`; we backfill all non-deleted ones.)

**Why:** Preserves current behavior. A package that was active yesterday should still be active today.

**Note:** `isActive = false` packages get `null/null` → not scheduled. That is intentional: they're off, and they'll need a deliberate re-scheduling to come back.

**Alternatives considered:**
- *Strict cutover (no backfill)* — user explicitly chose backfill.
- *Backfill in a separate script outside the migration* — harder to coordinate with deploys.

### Decision 5: Attempt gate feature flag

**Choice:** A env var `TRYOUT_DATE_PERIOD_ENABLED` (default `true` after a one-week grace period of `false`).

**Why:** Lets us deploy the schema and code, then enable the gate after verifying nothing broke. Cheap to remove later.

**Why env-var and not a DB column:** Env-var flip is one config change vs. a migration. Also, this is a one-time rollout — once stable, remove the flag.

**Alternatives considered:**
- *No flag, just ship it* — risky; if there's a bug, the only rollback is to revert the deploy.
- *DB column* — overkill; not user-facing.

### Decision 6: 403 response with structured error

**Choice:** Attempt gate rejects with:

```json
{ "error": "tryout_unavailable", "reason": "out_of_window" | "inactive" | "package_closed", "retryable": true }
```

**Why:** The user-facing tryout engine can render a meaningful message ("This tryout is not currently available. It opens on June 1.") instead of a generic 500.

`retryable: true` signals that this is a transient state, not a permanent failure.

**Alternatives considered:**
- *HTTP 410 Gone* — semantically close but suggests the resource is permanently gone, which is wrong (it may reopen later).
- *HTTP 404* — wrong; the tryout exists.

## Risks / Trade-offs

- **Risk:** Migration backfill could be slow on a large `packages` table.  
  **Mitigation:** Backfill is a single `UPDATE` with a `WHERE` clause; PG handles this in one statement. If the table is huge (>1M rows), wrap in a transaction and log progress. Acceptable for current scale.

- **Risk:** Asymmetric null semantics (`startDate=null` ≠ `endDate=null`) could trip up future developers.  
  **Mitigation:** Document loudly in the helper's JSDoc and in the admin form labels ("Mulai" required, "Berakhir" optional).

- **Risk:** Server clock skew between API and the user's perception of "now".  
  **Mitigation:** Server clock is authoritative. Document in admin UI that the window is server-local. Acceptable for single-TZ product.

- **Risk:** AND of multiple packages means a tryout in two packages requires BOTH to be open. If one is permanently retired, the tryout is permanently unavailable even if the other package is open.  
  **Mitigation:** Admin should unlink retired packages from tryouts (existing `SetPackageTryouts` mutation). Document in the design.

- **Risk:** Pre-existing test failures in `app/api/packages/route.test.ts` and similar (confirmed in P0-1 work) may compound when we add new assertions.  
  **Mitigation:** Focus on the new assertions; do not fix pre-existing unrelated failures.

## Migration Plan

1. **Pre-deploy:**
   - Snapshot the `packages` and `tryouts` tables (advisory only; migration is reversible).
2. **Deploy code (gate disabled):**
   - Schema migration runs: adds columns, runs backfill SQL.
   - Code deploys: API accepts/returns dates, admin form has date inputs.
   - `TRYOUT_DATE_PERIOD_ENABLED=false` — gate is no-op.
3. **Smoke test:**
   - Admin can set dates on a new package → visible in DB.
   - Existing packages still appear in buy page (backfill worked).
   - Attempt gate bypassed (flag off).
4. **Enable gate:**
   - Flip env var to `true`.
   - Monitor 4xx rate on `POST /api/tryout-attempts` for 24h.
5. **Cleanup (next sprint):**
   - Remove the env-var flag once stable.
   - Remove the no-op code path.

**Rollback:**
- Code: revert the deploy. Migration adds columns only; no destructive change to data.
- Schema: `ALTER TABLE DROP COLUMN startDate, endDate` is reversible.
- Backfill: leaves a one-way effect (existing rows have `startDate = createdAt`). If we need to "un-backfill", it's a simple `UPDATE ... SET startDate = NULL WHERE id IN (preserved-id-set)`.

## Post-test Decision Update

After manual testing, Package scheduling was tightened:

- Package forms/API require both `startDate` and `endDate`.
- Package availability ignores `isActive`.
- Both Package and Tryout `endDate = null` means not scheduled (hidden/closed).
- User-facing package filters and the parent-package side of the attempt gate must use package-specific strict date semantics.
- Tryout scheduling semantics remain unchanged.

## Open Questions

_None — package semantics were updated after testing: packages require both dates and ignore `isActive`; tryouts keep asymmetric null semantics._
