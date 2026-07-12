## 1. Setup & prep

- [x] 1.1 N/A — `canvas-confetti` was originally planned but the celebration feature was stripped per client request
- [x] 1.2 Export `Podium`, `RankingRow`, and `TabBar` from `components/ranking/RankingClient.tsx` (currently file-local)
- [x] 1.3 N/A — `period` is a query param, not a per-entry field; no `RankingEntry` change needed

## 2. Library: per-tryout ranking helper

- [x] 2.1 Add `getTryoutRanking(tryoutId: number, since?: Date): Promise<RankingEntry[]>` to `lib/ranking.ts` — group by userId, max totalScore, tie-break by earliest finishedAt
- [x] 2.2 Add `getUserTryoutRank(userId: string, tryoutId: number, since?: Date): Promise<{ rank, score } | null>` to `lib/ranking.ts`
- [x] 2.3 Add an in-memory TTL cache helper in `lib/ranking.ts` — generic `withTtlCache(key, ttlMs, compute)` with single-flight dedup
- [x] 2.4 Wire `getTryoutRanking` and `getUserTryoutRank` to use the TTL cache with `tryout:{tryoutId}:period:{period}` keys (5 min TTL)
- [x] 2.5 Write `lib/ranking.test.ts` cases for: best-attempt-per-user, tie-break by earliest finishedAt, deleted/in-progress exclusion, period filter

## 3. API: `GET /api/tryouts/[tryoutId]/ranking`

- [x] 3.1 Create `app/api/tryouts/[tryoutId]/ranking/route.ts` exporting `GET`
- [x] 3.2 In the handler: parse `tryoutId` (Int) and `period` query (`all|weekly|monthly`, default `all`, invalid → `all`)
- [x] 3.3 Call `requireActiveSession(request)`; return 401 on failure
- [x] 3.4 Verify the viewer has ≥ 1 finished attempt for the tryout; return 403 if not
- [x] 3.5 Compute `since` from period (weekly → 7d, monthly → 30d, all → undefined)
- [x] 3.6 Call cached helpers in parallel via `Promise.all`; build response `{ entries, viewer, participantCount, period }`
- [x] 3.7 Add `app/api/tryouts/[tryoutId]/ranking/route.test.ts` covering: 401, 403, 200, period filter, invalid period fallback, viewer rank when viewer is/isn't in top

## 4. Client component: `TryoutRankingPanel`

- [x] 4.1 Create `components/tryout/TryoutRankingPanel.tsx` (client component)
- [x] 4.2 Props: `{ tryoutId: number, attemptId: string, viewerUserId: string }`
- [x] 4.3 Add local state: `period: 'all' | 'weekly' | 'monthly'`, default `'all'`
- [x] 4.4 Use TanStack Query `useQuery` with key `['tryout-ranking', tryoutId, period]` calling a new fetcher
- [x] 4.5 Render the inner sub-tab nav (re-use `TabBar` from `RankingClient`)
- [x] 4.6 Render the podium (re-use `Podium`) handling 0/1/2/3+ participant cases
- [x] 4.7 Render the sticky your-row card below the podium with rank + name + score + "Kamu" indicator
- [x] 4.8 Render the scrollable list (re-use `RankingRow`) excluding the viewer
- [x] 4.9 Render the empty state when `entries.length === 0` and `participantCount === 0`
- [x] 4.10 N/A — confetti effect removed per client request
- [x] 4.11 N/A — localStorage flag was confetti-specific, removed
- [x] 4.12 N/A — reduced-motion toast was confetti fallback, removed
- [x] 4.13 Add `components/tryout/TryoutRankingPanel.test.tsx` covering: tab switch re-fetches, podium variants, sticky row, empty state, period-aware empty message, sub-tab switch with empty results

## 5. Integration: tab nav in `TryoutReviewMode`

- [x] 5.1 Add `tab: 'pembahasan' | 'ranking'` state to `TryoutReviewMode` (default `'pembahasan'`)
- [x] 5.2 Move the pembahasan body (question card, navigator, ragu-ragu, bottom nav) behind the `'pembahasan'` branch
- [x] 5.3 Render the outer tab control above the body: two pill buttons, active state on the current tab
- [x] 5.4 When `tab === 'ranking'`, mount `<TryoutRankingPanel tryoutId={tryout.id} attemptId={...} viewerUserId={...} />` instead of the pembahasan body
- [x] 5.5 Pass `tryoutId` and the current attempt's `userId` (derive from `useAttempt` payload or a prop from the page)
- [x] 5.6 Add the `#<rank>/<participantCount>` badge to the Ranking tab label — render as plain "Ranking" while the first ranking fetch is in flight
- [x] 5.7 Preserve the `idx` (question index) state across tab switches (it lives above the conditional return)
- [x] 5.8 Add `components/tryout/TryoutReviewMode.test.tsx` cases: default tab is pembahasan, switch to ranking mounts panel, switch back preserves idx, tab badge shows loading then rank

## 6. Plumbing & a11y

- [x] 6.1 When switching to the Ranking tab, move keyboard focus to the panel's `<h2>` heading (`tabIndex={-1}` + `useEffect`)
- [x] 6.2 Add `aria-current="page"` to the active outer tab button
- [x] 6.3 Add `role="tablist"` + `role="tab"` + `aria-selected` to the outer tabs; same for the inner sub-tabs
- [x] 6.4 N/A — `canvas-confetti` was removed; nothing to lazy-load

## 7. Verification

- [x] 7.1 `npm run lint` clean
- [x] 7.2 `npm run test` passes (lib, hooks, components, route tests). 61/61 in the 4 test files I touched; pre-existing failures in `app/api/packages` are unrelated (DB access).
- [x] 7.3 `npm run build` passes; new route `/api/tryouts/[tryoutId]/ranking` registered
- [x] 7.4 Manual smoke: log in, finish a tryout, land on pembahasan, switch to Ranking, verify podium + sticky row + weekly/monthly sub-tabs
- [x] 7.5 Manual smoke: switch back to All-time from Mingguan when weekly has 0 participants (regression for the bug we fixed earlier)
- [x] 7.6 N/A — confetti removed, no replay scenario
