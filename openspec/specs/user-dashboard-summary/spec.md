# User Dashboard Summary

## Purpose

Provides the aggregated summary data that powers every stat card on the user dashboard (`app/(user)/dashboard/`). Includes completed/remaining tryout counts, per-category scores (TWK/TIU/TKP), and user ranking — all scoped to currently-owned packages and computed from real `TryoutAttempt` data.

## Requirements

### Requirement: User dashboard exposes an aggregated summary
The system SHALL expose `GET /api/users/me/dashboard` for the authenticated user, returning a `DashboardSummary` object that powers every stat card on the user dashboard.

#### Scenario: Authenticated user with attempts
- **WHEN** a logged-in user with at least one completed tryout attempts calls `GET /api/users/me/dashboard`
- **THEN** the response is HTTP 200 with a JSON body matching `DashboardSummary`
- **AND** `completedTryouts` equals the count of distinct `tryoutId`s whose LATEST non-deleted `TryoutAttempt` has `finishedAt IS NOT NULL`, restricted to tryouts in packages the user currently owns (UserPayment status = pending|verified → Package → PackageTryout → Tryout)
- **AND** `remainingTryouts` equals the count of distinct `tryoutId`s that have at least one non-deleted `TryoutAttempt` with `finishedAt IS NULL` (resumable), deduped by `tryoutId` so each tryoutId contributes at most 1 even if multiple in-progress attempts exist, restricted to the same owned-package scope
- **AND** `categoryScores.twk`, `categoryScores.tiu`, `categoryScores.tkp` equal the sum of `twkScore`/`tiuScore`/`tkpScore` across ALL of the user's finished `TryoutAttempt` rows (including the original finished attempt of any re-attempted tryout)
- **AND** `rank` equals the user's all-time position computed by the same scoring rule used by `getRankingData` (sum of max `totalScore` per `tryoutId`; tie-break on earliest `updatedAt` ASC)

#### Scenario: Remaining tryouts = count of resumable tryouts (matches the tryout page)
- **WHEN** the user has 2 tryouts, both started and both in-progress (latest attempt is unfinished), and 0 finished
- **THEN** `remainingTryouts` equals 2 (the 2 in-progress tryouts are "remaining" because the user can resume them)
- **AND** `completedTryouts` equals 0
- **AND** this number matches the resumable count shown on `app/(user)/tryout/page.tsx` (the `inProgressByTryout.size` used in the "Kamu punya N tryout yang belum selesai" banner)

#### Scenario: Multiple in-progress attempts for the same tryout count as 1
- **WHEN** broken data produces two or more in-progress `TryoutAttempt` rows for the same `tryoutId`
- **THEN** `remainingTryouts` counts that `tryoutId` only ONCE (the dashboard dedupes by `tryoutId`)

#### Scenario: Re-attempted tryout excludes the original from completedTryouts
- **WHEN** the user has a finished attempt for tryout X AND a more recent in-progress re-attempt of the same tryout X
- **THEN** tryout X is classified as in-progress (not finished) for `completedTryouts`
- **AND** `completedTryouts` does NOT count tryout X
- **AND** `remainingTryouts` counts tryout X once (in the in-progress set)
- **AND** the original finished attempt's `twkScore`/`tiuScore`/`tkpScore` STILL contribute to `categoryScores` (the user earned those points)

#### Scenario: Only counts attempts for currently-owned packages
- **WHEN** the user has a `TryoutAttempt` for a tryout in a package they NO LONGER own (no `UserPayment` with status pending|verified for that package)
- **THEN** that attempt is NOT counted toward `remainingTryouts`, `completedTryouts`, or `categoryScores`
- **AND** this matches the tryout page's behavior where `ownedPkgIds` (from `useUserPayments`) gates access and the "Daftar Tryout Selesai" list only shows finished attempts in active owned packages

#### Scenario: Latest-attempt-wins classification
- **WHEN** the dashboard classifies the user's attempts
- **THEN** for each `tryoutId` in the owned-package scope, the most recent non-deleted `TryoutAttempt` (by `createdAt` DESC) determines the classification
- **AND** if that latest attempt has `finishedAt IS NULL`, the tryout is "in-progress"
- **AND** if that latest attempt has `finishedAt IS NOT NULL`, the tryout is "finished"
- **AND** a tryoutId falls into exactly one of the two sets (no overlap)
- **AND** `remainingTryouts = count(distinct in-progress tryoutIds)`
- **AND** `completedTryouts = count(distinct finished tryoutIds)`

#### Scenario: Resumable detection mirrors the tryout page
- **WHEN** the dashboard classifies in-progress tryouts
- **THEN** it uses the same definition the tryout list page uses: `finishedAt IS NULL` and `deletedAt IS NULL`, deduplicated by `tryoutId` with the most-recent attempt winning (matching the `inProgressByTryout` map built by `app/(user)/tryout/page.tsx`)
- **AND** the `timeLeftSeconds` field is NOT consulted (a `null` or `0` timer does not change resumability)

#### Scenario: Unauthenticated request
- **WHEN** a request is made to `GET /api/users/me/dashboard` with no valid session
- **THEN** the response is HTTP 401 with an error body
- **AND** no database queries are executed

#### Scenario: Stale or banned session
- **WHEN** the request carries a session that is stale, banned, or whose user no longer has role `user`
- **THEN** the response is HTTP 401/403 according to `requireActiveSession` semantics
- **AND** no summary fields are returned

#### Scenario: User with no attempts or purchases
- **WHEN** the user has zero `TryoutAttempt` rows and zero `UserPurchase` rows
- **THEN** `completedTryouts`, `remainingTryouts`, and `tryoutCount` are all `0`
- **AND** `totalScore` is `0`
- **AND** `categoryScores.twk/tiu/tkp` are all `0`
- **AND** `rank` is `null` (the user has no ranking entry)

### Requirement: Ranking helper computes a single user's rank
The system SHALL provide a `getUserRank(userId, since?)` function in `lib/ranking.ts` that returns `{ rank, totalScore, tryoutCount } | null` for one user, using the same scoring rule as `getRankingData`.

#### Scenario: User with attempts
- **WHEN** `getUserRank(userId)` is called for a user with at least one finished attempt
- **THEN** it returns an object where `totalScore` equals the sum of the user's max `totalScore` per `tryoutId`
- **AND** `tryoutCount` equals the number of distinct `tryoutId`s with at least one attempt
- **AND** `rank` equals `1 + count(users with strictly higher totalScore) + count(users with equal totalScore AND earlier earliest updatedAt)`

#### Scenario: User with no attempts
- **WHEN** `getUserRank(userId)` is called for a user with no `TryoutAttempt` rows
- **THEN** it returns `null`

#### Scenario: Date range filter
- **WHEN** `getUserRank(userId, since)` is called with a `since` date
- **THEN** only `TryoutAttempt` rows with `createdAt >= since` are considered when computing `totalScore`, `tryoutCount`, and `rank`

### Requirement: Dashboard UI consumes the summary
The `DashboardHomeClient` component MUST render values from `DashboardSummary` and MUST NOT contain hardcoded stat values.

#### Scenario: Render with summary
- **WHEN** the hook returns a non-null `DashboardSummary`
- **THEN** the "Sisa Tryout" stat card displays `summary.remainingTryouts`
- **AND** the "Tryout Selesai" stat card displays `summary.completedTryouts`
- **AND** the "Peringkat" stat card displays `#${summary.rank}` when `summary.rank` is non-null and `—` otherwise
- **AND** the "Progress Per Materi" bars display `summary.categoryScores.twk/tiu/tkp` as integer percentages
- **AND** the "Akses Video" card displays the "Coming soon" badge regardless of the summary

#### Scenario: Render during load
- **WHEN** the summary is being fetched on first paint
- **THEN** the stat cards show a non-flickering loading state (skeleton or `—` placeholder) instead of hardcoded numbers

### Requirement: Server prefetch hydrates the client
The dashboard route handler MUST prefetch the dashboard summary via TanStack Query and wrap the client component in a `HydrationBoundary` so the first client render does not trigger a network refetch.

#### Scenario: First paint
- **WHEN** a user navigates to `/dashboard`
- **THEN** the server prefetches `['dashboard', 'summary', userId]` before rendering
- **AND** the client hook reads the prefetched cache and skips its initial fetch
