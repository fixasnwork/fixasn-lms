## Context

The pembahasan view (`components/tryout/TryoutReviewMode.tsx`) is the post-completion screen for a `TryoutAttempt`. It already receives the full `tryout` payload (with `tryoutId`) and the current attempt's `answers` + scores. The user is in a high-motivation state — they just finished, want validation, want to compare.

The existing global ranking helper in `lib/ranking.ts` (`getRankingData`) aggregates per-user total score across **all** tryouts, so it answers "who's the best player on the platform?", not "who did best on this tryout?" There is no per-tryout leaderboard today.

A new ranking tab must be added to `TryoutReviewMode` so users can see, for the tryout they just finished, how they compare to other finishers of the same tryout.

## Goals / Non-Goals

**Goals:**

- Ship a per-tryout ranking view inside the existing pembahasan screen with no new DB tables/columns.
- Re-use the global ranking visual language (Podium, RankingRow, TabBar) to avoid design drift.
- Make the view snappy on first paint (TTL cache) without sacrificing reasonable freshness (≤ 5 min lag after new submissions).
- Add a celebratory moment for top-3 finishers without nagging users on every revisit.

**Non-Goals:**

- Persistent period filter across sessions (tab resets to "all" each time the user opens pembahasan).
- Comparing this attempt vs the user's previous attempts on the same tryout.
- Showing a rank badge on the "Daftar Tryout Selesai" cards (out of scope; future work).
- Multi-instance cache coherence (we accept a 5-minute staleness window on multi-instance deploys).
- Public/anonymous access to the ranking — must be authenticated and have a finished attempt for the tryout.

## Decisions

### 1. Endpoint shape: `GET /api/tryouts/[tryoutId]/ranking?period=all|weekly|monthly`

Single endpoint, period in query string. Returns `{ entries: RankingEntry[], viewer: { rank, score, totalParticipants } | null, participantCount }`.

- **Why not a sub-resource of attempts?** The tryout is the natural axis (same tryout across users), and the global ranking page already keys on tryout semantics.
- **Why not embed ranking in `GET /api/tryout-attempts/[id]`?** Embedding forces a ranking fetch on every attempt load, including the in-progress page where the pembahasan tab is hidden. Separate endpoint keeps it lazy and cacheable.

### 2. Reuse `RankingEntry` shape + refactor `lib/ranking.ts`

`lib/ranking.ts` already exports `RankingEntry`. The global helper builds a sum-across-tryouts score; per-tryout just needs the per-user max for that tryout. Add a sibling helper `getTryoutRanking(tryoutId, since?)` returning `{ entries, viewer }`.

**Why not generalize `getRankingData`?** Different aggregation logic, different "viewer" semantics. A separate function is clearer than a flag. Both helpers share `getInitials` and the `RankingEntry` mapper.

### 3. Lazy compute + in-memory TTL cache (5 min)

`Map<key, { data, computedAt }>` where `key = "tryout:{tryoutId}:period:{period}"`. TTL 300s. Invalidation is implicit (TTL expiry). On cache miss, recompute from Prisma.

**Alternatives considered:**

- Materialize-on-submit (write ranking row in `PUT /api/tryout-attempts/[id]`): extra write on the hot path + risk of drift if ranking algorithm changes.
- Redis/Memcached: infra cost not justified for v1; one server instance handles current load.
- TTL-only, no invalidation: **chosen**. 5-min staleness is fine because the user's own score is already finalized; the only thing that changes between expiry windows is *other* users crossing the finish line.

**Limitation:** In a multi-instance deploy, instances don't share cache, so a fresh compute on instance A won't invalidate instance B's cached value. Acceptable for v1; tracked as risk below.

### 4. Tab state: outer `Pembahasan | Ranking`, inner `All-time | Mingguan | Bulanan`

Two-level state, both local to the panel.

- Outer tab lives in `TryoutReviewMode` so the pembahasan cards and ranking panel don't both mount.
- Inner sub-tab lives in `TryoutRankingPanel` because it only affects ranking fetch.
- Default outer tab is "Pembahasan" (preserves current behaviour). Sub-tab default is "all" (matches global ranking).
- Sub-tab does **not** persist across sessions (per non-goal).

**Why two levels instead of one?** The outer tab isolates the heavy ranking fetch from the pembahasan fetch — switching to Ranking mounts the panel + triggers a query; switching back unmounts and discards the panel state. Sub-tab is just a query-param switch, no remount.

### 5. New component `components/tryout/TryoutRankingPanel.tsx` (client)

Reuses `Podium`, `RankingRow`, `TabBar` from `components/ranking/RankingClient.tsx` (export them so we can import). Owns the sub-tab state, fetches via TanStack Query (`useQuery` with key `['tryout-ranking', tryoutId, period]`).

**Why client component?** Tab/sub-tab state. Server-rendering the panel is unnecessary since the pembahasan page already gates on `finishedAt` (client-side routing).

### 7. Sticky your-row: separate card pinned at the top of the list, not sticky-positioned

A sticky `position: sticky` element competes with other sticky UI (page header, future components). Cleaner: render the viewer's row as a separate card **above** the scrollable list, with a subtle "Kamu" label and the same gradient highlight as the global ranking. The list below renders entries 1..N (no in-list duplicate).

### 8. Auth: `requireActiveSession` + must have a finished attempt for the tryout

The endpoint requires an active session **and** verifies the viewer has at least one `TryoutAttempt` with `tryoutId = X` and `finishedAt != null`. Without this, anyone authenticated could probe rankings for tryouts they didn't buy.

`tryoutId` is available on the JWT-loaded `data.tryout` in the pembahasan page, so no extra server call from the client to derive it.

## Risks / Trade-offs

- **Multi-instance stale cache** → Document 5-min acceptable; revisit if we move to multiple instances. Add a TODO in `lib/ranking.ts`.
- **`RankingClient` exports** → Currently `Podium`/`RankingRow`/`TabBar` are file-local. Need to export them or duplicate the JSX. Decision: export from `RankingClient.tsx` to avoid duplication.
- **Confetti feature removed** → original spec called for a one-time confetti for top-3 viewers, but the client requested it be stripped. The panel now renders plain — no celebration effect on top-3 finish.
- **Empty ranking (1-2 participants)** → Per grill-me: show whatever exists. The list and podium just render fewer rows. No special "coming soon" CTA in v1.
- **First-submit user, no other participants** → Viewer's rank = 1, score = X, totalParticipants = 1. Podium shows just them. Confetti fires (rank ≤ 3). Reasonable, not embarrassing.
- **Tab switcher is keyboard-trap-prone** → Make sure focus moves to the panel heading (`tabIndex={-1}` + `useEffect` focus) when switching to Ranking.
- **API load spike** → If 1000 users finish a tryout within 5 min, the same `(tryoutId, period="all")` query runs ~200 times across instances. Add an in-process single-flight (Promise dedup) so concurrent misses share one Prisma query.

## Migration Plan

- No DB migration. No env changes. No new npm deps (the originally-planned `canvas-confetti` dependency was uninstalled when the celebration feature was stripped).
- Deploy is feature-on-by-default because the tab is only reachable from `/tryout/[attemptId]` (a post-completion URL the user lands on naturally).
- Rollback: revert the PR; no schema/infra changes to unwind.
- Observability: log `(tryoutId, period, durationMs, cacheHit)` on the new endpoint; alert if p95 > 500ms.

## Open Questions

- Weekly/monthly window timezone — currently global ranking uses server local time. Defer to implementation; same convention for consistency.
- Should the panel auto-refresh every 60s while the user lingers on the tab? Skip for v1 (user-triggered via sub-tab switch).
- Should we cache the `viewer` rank separately so the tab-badge "Ranking · #23/50" in the outer tab header is instant on second visit? Defer; can be added without API change.
