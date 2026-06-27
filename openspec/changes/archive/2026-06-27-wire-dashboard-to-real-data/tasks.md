## 1. Ranking helper

- [x] 1.1 Add `getUserRank(userId, since?)` to `lib/ranking.ts` returning `{ rank, totalScore, tryoutCount } | null`. Reuse the same scoring rule as `getRankingData` (sum of max `totalScore` per `tryoutId`; tie-break `earliestUpdatedAt` ASC).

## 2. Shared type

- [x] 2.1 Add `DashboardSummary` interface to `lib/types.ts` with fields: `remainingTryouts`, `completedTryouts`, `rank` (nullable), `totalScore`, `tryoutCount`, `categoryScores { twk, tiu, tkp }`.

## 3. API route

- [x] 3.1 Create `app/api/users/me/dashboard/route.ts` exporting `GET` that uses `requireActiveSession`, aggregates `TryoutAttempt` (finishedAt non-null) for `completedTryouts` + per-category sums, joins `UserPurchase` → `Package.tryoutCount` for `remainingTryouts` (floored at 0), and calls `getUserRank(session.user.id)` for `rank`/`totalScore`/`tryoutCount`. Returns the `DashboardSummary` JSON.
- [x] 3.2 Create `app/api/users/me/dashboard/route.test.ts` mocking Prisma + auth, covering: 200 with full data, 401 unauthenticated, completed-only counts, rank tie-break, no-attempts case (rank null).

## 4. Hook

- [x] 4.1 Create `hooks/useDashboardSummary.ts` exporting `dashboardSummaryQueryKey(userId)` and `useDashboardSummaryQuery()`. The hook reads the current user from the auth store/NextAuth session, uses the query key, and has `staleTime: 60_000`.

## 5. Client wiring

- [x] 5.1 Update `components/dashboard/DashboardHomeClient.tsx` to consume `useDashboardSummaryQuery`. Replace hardcoded `remainingTryouts`, `usedTryouts`, `'#42'`, and TWK/TIU/TKP literal array with values from the summary. Add a loading skeleton (or `—` placeholder) for first paint. Add a "Coming soon" badge to the Akses Video card; keep the card in the layout.

## 6. Server prefetch

- [x] 6.1 Update `app/(user)/dashboard/page.tsx` to await `auth()`, get the userId, then use the existing `QueryClient` + `HydrationBoundary` pattern (mirror `app/(user)/layout.tsx`) to prefetch the dashboard summary before rendering `DashboardHomeClient`.

## 7. Tests

- [x] 7.1 Add Vitest cases to `lib/ranking.test.ts` for `getUserRank`: user with no attempts returns `null`; user with one attempt returns rank 1; ties are broken by earliest `updatedAt`; `since` filter excludes older attempts.

## 8. Verification

- [x] 8.1 Run `npm run lint`, `npm run test`, and `npm run build` and confirm all green. Fix any issues surfaced by the new code.

## 9. Resumable tryouts mirror the tryout page (latest-attempt-wins)

- [x] 9.1 Update `app/api/users/me/dashboard/route.ts` to use **latest-attempt-wins** classification, matching the resume API and `app/(user)/tryout/page.tsx`. For each `tryoutId`, the most recent non-deleted `TryoutAttempt` decides whether the tryout is in-progress (`finishedAt IS NULL`) or finished (`finishedAt IS NOT NULL`). `completedTryouts` counts distinct tryoutIds whose latest is finished (excluding re-attempted tryouts); `categoryScores` still sums scores across ALL finished attempts (so the original finished attempt of a re-attempted tryout still contributes its points). Implementation: a single `prisma.tryoutAttempt.findMany` ordered `createdAt: 'desc'`, group by `tryoutId` in JS keeping the first (most recent) per tryout.
- [x] 9.2 Update `app/api/users/me/dashboard/route.test.ts`: replace the two-query mock (`groupBy` + `findMany`) with a single `findMany` mock returning a list of attempts. Update existing assertions to the new semantic (e.g. `completedTryouts` is now distinct finished tryouts, not count of finished rows). Add a new case: a finished attempt for tryout X followed by a more recent in-progress re-attempt of X → `completedTryouts` does not count X, `categoryScores` still includes the original finished attempt's scores.
- [x] 9.3 Update `specs/user-dashboard-summary/spec.md` (formula wording, new "Latest-attempt-wins classification" scenario, new "Re-attempted tryout excludes the original from completedTryouts" scenario, updated "Resumable detection mirrors the tryout page" scenario) and `design.md` decision #4 to document the latest-wins rule + the re-attempt edge case + the chosen implementation (single `findMany` + JS aggregation).

## 10. "Sisa Tryout" = count of resumable tryouts, deduped by tryoutId

- [x] 10.1 Update `app/api/users/me/dashboard/route.ts` so `remainingTryouts = distinctInProgressTryouts` (count of distinct tryoutIds with an in-progress attempt, deduped by tryoutId via the latest-wins Map). No `purchasedTryoutSlots` subtraction.
- [x] 10.2 Update `app/api/users/me/dashboard/route.test.ts`: simplify tests (remove `getActiveTryoutIds` mock, remove inactive-package test). Keep the user's scenario (2 in-progress → remaining=2), dedup test, re-attempted tryout test, and no-attempts test.
- [x] 10.3 Update `specs/user-dashboard-summary/spec.md` (remove deferred active-scope scenarios, update wording in remaining scenarios to drop the "active scope" qualifier) and `design.md` decision #4 to document the current simplified formula + deferred active scope rationale.

## 11. Access check via UserPayment (matching the tryout page)

- [x] 11.1 Update `app/api/users/me/dashboard/route.ts` to scope attempts to the user's currently-owned packages only. Replaces the earlier `UserPurchase` query with a `Payment.findMany` (where `status IN ('pending','verified')`) matching the tryout page's `ownedPkgIds`. Filters out attempts for tryouts in packages the user no longer owns (fixes the discrepancy where the dashboard showed 1 finished tryout but the tryout page showed 0).
- [x] 11.2 Update `app/api/users/me/dashboard/route.test.ts` to mock `payment.findMany` (instead of `userPurchase.findMany`). Add a test case: user with a finished attempt in a package they no longer own → excluded from remaining/completed/categoryScores. Update all existing tests to include a payment fixture with valid date ranges.
- [x] 11.3 Update `specs/user-dashboard-summary/spec.md` (new "Only counts attempts for currently-owned packages" scenario, updated formula wording) and `design.md` decision #4 to document the Payment-based access check + null-date handling.

## 12. Remove null-date override (match tryout page's isAvailable exactly)

- [x] 12.1 Update `app/api/users/me/dashboard/route.ts` to apply `isAvailable` directly (no `p.package.startDate && p.package.endDate ? isAvailable : true` fallback). The tryout page's `isPackageAvailable` (alias of `isAvailable`) returns false for null-dated packages; the dashboard now matches that exactly. Both surfaces agree on which packages/tryouts are in scope.
- [x] 12.2 Update `design.md` to document the direct `isAvailable` use + removal of the null-date override.
