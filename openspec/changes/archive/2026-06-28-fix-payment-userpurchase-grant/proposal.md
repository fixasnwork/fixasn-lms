## Why

The archived `2026-06-28-video-pembelajaran` change designed the **read side** of the access grant model — the `UserPurchase` schema, the `@@unique([userId, packageId])` constraint, the spec scenario "Pending purchase grants access," and the `userHasVideoPackageAccess` query in `app/api/videos/route.ts`. It forgot the **write side**: nothing in the codebase ever creates a `UserPurchase` row. The `Payment` flow (`POST /api/payments` and `PUT /api/payments`) only writes to the `Payment` table, so a verified purchase never produces the access grant the spec assumes exists. The result: a user who has paid for and been granted a video-enabled package is correctly denied access by the access check, because the source-of-truth `UserPurchase` table is empty for that `(userId, packageId)` pair.

This is a missing-wire bug, not a design bug. The two-table split (Payment = money event, UserPurchase = access grant) is correct; the trigger that creates the grant on a successful payment is what's missing.

## What Changes

- **`POST /api/payments`:** after creating the `Payment` row, upsert a `UserPurchase` row for the same `(userId, packageId)` with `paymentId` pointing at the new payment. Pending payments grant access per spec scenario "Pending purchase grants access," so the grant is created immediately, not deferred to admin verification.
- **`PUT /api/payments`:** when the admin transitions a payment's `status` to `verified`, upsert the corresponding `UserPurchase` (idempotent — handles pre-existing payments that lack a grant row, e.g., payments created before this fix shipped). When the admin transitions to `rejected` / `expired` / `blocked`, soft-delete the linked `UserPurchase` row (defense-in-depth — the existing `OR` clause in the access check would already exclude denied statuses, but soft-deleting makes the revocation explicit and visible in the data).
- **Idempotency:** the `@@unique([userId, packageId])` constraint is the upsert key. Re-submits, retries, and status flip-flops (rejected → verified) all collapse to a single active `UserPurchase` row per `(userId, packageId)`.
- **No hook / API / client changes** — the existing `useCreatePayment.onSuccess` invalidation of `['user-videos']` (`hooks/useTryoutQueries.ts:88-90`) already triggers a refetch on the buyer's tab after a successful purchase. For the admin's `PUT` path, the buyer's tab picks up the change on its next `staleTime: 60_000` refetch; no server-push mechanism is added in this change.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `video-pembelajaran`: extend the existing "User access derives from non-rejected purchase" requirement with three new scenarios that bind the access grant to the payment lifecycle. The requirement is already in `openspec/specs/video-pembelajaran/spec.md`; this change adds the missing write-side contract.

## Impact

**Files modified (1):**
| File | Change |
|---|---|
| `app/api/payments/route.ts` | `POST` upserts `UserPurchase` after `Payment.create`; `PUT` upserts on `verified`, soft-deletes on `rejected`/`expired`/`blocked`. |

**Files modified (spec, 1):**
| File | Change |
|---|---|
| `openspec/specs/video-pembelajaran/spec.md` | `MODIFIED Requirements` block on "User access derives from non-rejected purchase" — adds 3 scenarios: payment creation grants access, admin verification is idempotent, admin deny revokes. |

**No schema changes.** No new fields. The `UserPurchase` table already exists with the right shape; only the application code that writes to it is being added.

**No test changes required** — `app/api/payments/route.ts` has no existing test file. The fix is verifiable end-to-end via the existing `scripts/diagnose-video-access.ts` script and a manual buy/verify cycle. Adding a new test file for the payments route is out of scope for this bug fix; the codebase convention is to add one when modifying the route, so a follow-up could add `route.test.ts` covering the new upsert and soft-delete branches.

**Diagnostic artifact added (reused):** `scripts/diagnose-video-access.ts` — written during diagnosis to confirm the empty `UserPurchase` table for the test user. Useful as a one-off admin utility for future triage of access issues.
