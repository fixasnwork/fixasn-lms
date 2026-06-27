## Context

The user dashboard (`app/(user)/dashboard/page.tsx` → `components/dashboard/DashboardHomeClient.tsx`) currently fakes every stat. The data the UI pretends to show already exists in Prisma: `TryoutAttempt.twkScore/tiuScore/tkpScore/totalScore/finishedAt` (set by `PUT /api/tryout-attempts/[attemptId]`), `UserPurchase` (grants access to a `Package` which carries `tryoutCount`), and a `lib/ranking.ts` function that aggregates attempts into a ranked top-100. The `/ranking` page already calls `getRankingData` server-side and pipes the result into a client component. The dashboard needs the same machinery but for a single user, and the only piece missing is a "give me my rank" helper — `getRankingData` returns the top 100 and has no single-user shortcut.

`Package` has no `hasVideo` / `videoAccess` field; modeling video entitlements is out of scope. The UI keeps the "Akses Video" card with a "Coming soon" badge and the API omits the field.

The rest of the app already has a working pattern: `requireActiveSession` for auth (see `lib/routeAuth.ts`), TanStack Query + `HydrationBoundary` for server prefetch (see `app/(user)/layout.tsx`), and a hooks folder for client queries (`hooks/useTryoutQueries.ts`). The dashboard will follow the same pattern.

## Goals / Non-Goals

**Goals:**
- Every stat on the user dashboard reflects the logged-in user's real DB state.
- The Peringkat card matches the algorithm used on `/ranking` so the two surfaces never disagree.
- First paint is server-rendered (no client-side refetch on cold load).
- Existing `/ranking` and `getRankingData` callers are unaffected.

**Non-Goals:**
- Adding a `hasVideo` field or any video entitlement logic.
- Changing the layout, copy, or visual design of dashboard cards.
- Adding a leaderboard widget, charts, or new cards.
- Banned/admin handling beyond the standard `requireActiveSession` guard.

## Decisions

### 1. Add `getUserRank(userId, since?)` to `lib/ranking.ts` instead of filtering `getRankingData`
**Why**: `getRankingData` returns up to 100 rows of joined `user` + `purchase` data and is meant for the leaderboard page. Calling it on every dashboard load and doing `findIndex` is wasteful and breaks the moment a user is outside the top 100. The helper fetches only the data it needs and computes the rank by counting users with a higher score.

**Alternative considered**: filter `getRankingData` results for the current user. Rejected — wasteful, breaks past top 100, ties the dashboard to the leaderboard's 100-cap.

### 2. Single `GET /api/users/me/dashboard` endpoint, not per-card endpoints
**Why**: Five stats share the same `TryoutAttempt`/`UserPurchase` reads; one endpoint keeps it to three Prisma calls total (`findMany` attempts, `findMany` purchases, rank aggregation) and gives the client a single loading state.

**Alternative considered**: one endpoint per card. Rejected — N+1 queries, multiple loading states, no real benefit because the data is cheap to aggregate.

### 3. Compute `categoryScores` from stored `twkScore/tiuScore/tkpScore` columns, not from `AttemptAnswer` join
**Why**: `PUT /api/tryout-attempts/[attemptId]` already writes per-category scores (verified in scout). Reading them is one `SUM` aggregate. Joining `AttemptAnswer` would require re-running `lib/scoring.ts` logic.

**Alternative considered**: re-score from `AttemptAnswer`. Rejected — duplicates logic and depends on `QuestionOption.correctAnswer`/`tkpValue` being stable.

### 4. `remainingTryouts = distinctInProgressTryouts` (count of resumable tryouts, deduped by tryoutId)
**Why**: The user-visible semantic is "how many tryouts can I resume right now?". That is the count of distinct `tryoutId`s the user has an in-progress attempt for, deduped by `tryoutId` (data safety for broken duplicates).

This number is the same one shown on the tryout page's "Kamu punya N tryout yang belum selesai" banner (where N = `inProgressByTryout.size`). Making the dashboard mirror that count directly is the most defensible definition of "Sisa Tryout" because:
1. The user can see the same number on both surfaces — no confusion.
2. In-progress tryouts are the most actionable stat (the user can click "Lanjutkan" immediately).
3. Finished tryouts are excluded from the count but still count toward `completedTryouts`, so the user can see both "how much I've done" and "how much is still open" in two complementary stats.

**Per-tryout classification**: the dashboard uses **latest-attempt-wins** semantics, matching the resume API and the tryout page's `inProgressByTryout` map:
- For each `tryoutId` the user has attempted, look at the most recent non-deleted `TryoutAttempt` (by `createdAt` DESC).
- If that latest attempt has `finishedAt IS NULL`, the tryout is "in-progress" (resumable).
- If that latest attempt has `finishedAt IS NOT NULL`, the tryout is "finished".
- A `tryoutId` falls into **exactly one** of the two sets.

A tryout that was **finished and then re-attempted** is classified as in-progress only. The original finished attempt is excluded from `completedTryouts` (the user is in the middle of a re-attempt, so the tryout is not "done" in the latest sense) — but its `twkScore`/`tiuScore`/`tkpScore` STILL contribute to `categoryScores` because the user earned those points.

If broken data ever produces multiple in-progress attempts for the same `tryoutId`, the Map dedup ensures the tryout is counted once.

**Implementation**: single `prisma.tryoutAttempt.findMany` ordered `createdAt: 'desc'`; group by `tryoutId` in JS keeping the first (most recent) per tryout; classify based on `finishedAt` of the latest. `getUserRank` is kept untouched (ranking is a global signal shared with `/ranking`).

**Access check**: the dashboard queries `prisma.payment.findMany` with `status IN ('pending','verified')` and `package.deletedAt: null` to build the set of tryouts the user currently owns. This matches the tryout page's `ownedPkgIds` (from `useUserPayments`). `isAvailable` is applied directly to both packages and tryouts (matching the tryout page's `isPackageAvailable`/`isAvailable(t)` checks) — no null-date override. If a package has null dates, `isAvailable` returns false and the package is excluded, same as the tryout page. Attempts for packages the user no longer owns (no Payment row) are excluded.

**Trial tryouts**: excluded from scope because they have no `UserPayment` row (same as the tryout page's `ownedPkgIds`).

`timeLeftSeconds` is not consulted — matches the tryout page and resume API.

**Active-scope filtering (date windows, soft-deleted packages/tryouts)**: intentionally deferred. `isAvailable` from `lib/availability.ts` treats `null + null` dates as "inactive", but many packages in the wild have unset dates. Applying it naively zeroed both `remainingTryouts` and `completedTryouts` for the user. The scope filter needs a separate pass with proper null-date handling (treat `null` dates as "always available" rather than "inactive"). This is tracked as a follow-up.

**Alternative considered (rejected)**: `remaining = purchasedTryoutSlots − distinctFinishedTryouts`. Produced `remaining = 0` for a user with 2 in-progress tryouts and 0 finished, which the user reported as inconsistent with the tryout page's "2 resumable" hint.

**Alternative considered (rejected)**: `remaining = purchasedTryoutSlots − distinctInProgressTryouts − distinctFinishedTryouts`. Over-subtracted in re-attempted tryout cases.

**Alternative considered (rejected)**: count attempts in the in-progress set without dedup by `tryoutId`. Unsafe for broken data.

**Alternative considered (rejected)**: `getActiveTryoutIds` helper + `isAvailable` filtering. Rejected for this pass — `isAvailable` null-date semantics caused both stats to zero out. Will be revisited in a follow-up with null-date-aware logic.

### 5. Server prefetch via `HydrationBoundary` matching the user layout pattern
**Why**: `app/(user)/layout.tsx` already establishes the pattern with `QueryClient` + `HydrationBoundary` from `@tanstack/react-query`. The dashboard page reuses it; the hook uses the same query key shape `['dashboard', 'summary', userId]` to share cache with future surfaces.

**Alternative considered**: client-only fetch with `isLoading` skeleton. Rejected — produces a visible "0 / #42" flash before real data lands, which the user already complained about indirectly (it was the source of the fake data).

### 6. Video card stays in the UI as "Coming soon"
**Why**: User explicitly asked to keep the card but mark it. The API does not include `videoAccess`, the client renders a static "Coming soon" badge, and the schema is untouched. When a `hasVideo` field lands later, the badge is the only thing to remove.

## Risks / Trade-offs

- **Rank query touches every user with attempts** → Mitigation: `getUserRank` reads attempts with a `select` (no full row hydration) and groups in memory. For expected scale (≤ a few thousand users) this is fine. If the user table grows past ~10k, switch to a `prisma.user.findMany` over a materialized score per user.
- **No `status` field on `TryoutAttempt`**, so completion is detected by `finishedAt IS NOT NULL` → Mitigation: PUT only sets `finishedAt` when scores are written, so attempts in progress have `finishedAt = null`. Documented in the spec.
- **Old attempts with all-zero scores** (pre-PUT-score-writing rows) → Mitigation: not in scope; they still count as "completed" via `finishedAt IS NOT NULL` and skew `categoryScores` toward 0. Documented as a known limitation; historical backfill is non-goal.
- **Double-counting purchases**: a user can buy the same package twice → Mitigation: sum `package.tryoutCount` raw, subtract distinct finished tryouts. Worst case is a slightly inflated `remainingTryouts`, never a negative.

## Migration Plan

No data migration. Deploy order:
1. Land `getUserRank` + tests (additive, no consumer yet).
2. Land `DashboardSummary` type + `/api/users/me/dashboard` route + tests.
3. Land hook + rewire `DashboardHomeClient` + `HydrationBoundary` in `page.tsx`.

Rollback: revert the three commits independently. The API route is new, the helper is additive, the UI change is gated on the hook returning data (loading state covers the gap during a partial rollback).

## Open Questions

- None. Video entitlement is explicitly deferred per the user's "skip the video card for now" decision.
