## Why

The user dashboard at `app/(user)/dashboard/page.tsx` and `components/dashboard/DashboardHomeClient.tsx` is currently a pure mock: the only real input is `session.user.name` from NextAuth, and every stat (sisa tryout, tryout selesai, peringkat, akses video, progress TWK/TIU/TKP) is a hardcoded literal (`0`, `'#42'`, `false`, `[78, 65, 82]`). The Peringkat card in particular shows `'#42'` regardless of who is logged in, which is misleading and makes the dashboard useless as a real product surface. The data needed (attempts, purchases, ranking) is already modelled in Prisma and aggregated by `lib/ranking.ts` for the `/ranking` page; the dashboard just does not call any of it.

## What Changes

- Add a `getUserRank(userId, since?)` helper in `lib/ranking.ts` that reuses the same score formula as `getRankingData` (sum of max `totalScore` per `tryoutId` for the user; rank derived by counting how many users have a higher score, with the same `earliestUpdatedAt` tie-break) so the Peringkat card on the dashboard can show the user's actual position without loading the full top-100 list.
- Add a new `GET /api/users/me/dashboard` route that returns a `DashboardSummary` payload for the authenticated user: `remainingTryouts`, `completedTryouts`, `rank` (all-time), `totalScore`, `tryoutCount`, and `categoryScores { twk, tiu, tkp }` derived from `TryoutAttempt.twkScore/tiuScore/tkpScore`. The Video access field is omitted from the response (status `false`, "Coming soon" copy in the UI) because `Package` has no video-related field — that work is deferred.
- Add `DashboardSummary` to `lib/types.ts` so the API and client share one contract.
- Add a TanStack Query hook `useDashboardSummaryQuery()` in `hooks/useDashboardSummary.ts` with a 60s stale time, hydrating from the server prefetch.
- Replace the hardcoded values in `DashboardHomeClient.tsx` with values from the hook, render a loading skeleton on first paint, and mark the Akses Video card with a "Coming soon" badge so the layout does not regress.
- Update `app/(user)/dashboard/page.tsx` to prefetch the dashboard summary server-side via TanStack Query and wrap the client in `HydrationBoundary`, mirroring the pattern already used in `app/(user)/layout.tsx`.
- Add Vitest coverage: `getUserRank` cases (no attempts, ties, top-1) in `lib/ranking.test.ts` and a route test for `/api/users/me/dashboard` covering auth + aggregates.

No breaking changes to existing APIs. The `/ranking` page and `getRankingData` callers are untouched.

## Capabilities

### New Capabilities
- `user-dashboard-summary`: Server-aggregated per-user summary (remaining tryouts, completed count, rank, total score, per-category progress) powering the user dashboard, exposed via `/api/users/me/dashboard` and consumed by the dashboard client.

### Modified Capabilities
- None. `user-package-catalog` and `tryout-page-view` only describe purchase/tryout flows; the dashboard summary is a new read-side surface and does not change their requirements.

## Impact

- **Code**: `lib/ranking.ts` (additive helper), `lib/types.ts` (new type), `app/api/users/me/dashboard/route.ts` (new), `hooks/useDashboardSummary.ts` (new), `components/dashboard/DashboardHomeClient.tsx` (rewire), `app/(user)/dashboard/page.tsx` (server prefetch).
- **APIs**: New `GET /api/users/me/dashboard` returning `DashboardSummary`. No existing routes change.
- **Data**: Reads only. No schema or migration required. Per-category scores are already populated by `PUT /api/tryout-attempts/[attemptId]`.
- **Auth**: Route uses `requireActiveSession` (same guard as other user-scoped APIs). Admin users are not blocked from the endpoint, but the dashboard page is mounted under the user route group so admins normally never hit it.
- **Performance**: One `tryoutAttempt.findMany` (attempts), one `userPurchase.findMany` (packages), one rank query reusing the same Prisma data path. No N+1. Capped at 100 ranking rows only when computing the user's rank.
