## Why

The current global `/ranking` page shows total score aggregated across every tryout a user has ever done. Clients who finish a specific tryout have no way to see how they stack up against the people who did **the same tryout** — i.e., the cohort they're actually competing with. Adding a per-tryout ranking view to the pembahasan (review) screen closes that loop right after submission, when competitive motivation peaks.

## What Changes

- Add a second tab "Ranking" to the pembahasan view (`TryoutReviewMode`), set beside the existing "Pembahasan" tab.
- Inside the Ranking tab, add an All-time / Mingguan / Bulanan sub-tab (mirrors global ranking pattern).
- New `GET /api/tryouts/[tryoutId]/ranking?period=all|weekly|monthly` endpoint returns ranking entries (name, avatar, score) plus the current user's rank + score for that tryout.
- New `lib/ranking.ts` helper `getTryoutRanking(tryoutId, since?)` that re-uses the same `RankingEntry` shape as the global helper but scores per-tryout instead of summed.
- Lazy compute with TTL cache; invalidate cache key on new attempt submit for that tryout.
- One-time confetti modal on first switch to Ranking tab if the current user lands in top 3 (tracked via `localStorage` keyed by `attemptId`).
- Sticky "your row" card pinned under the podium, separate from the scrollable list.
- New spec: `per-tryout-ranking`.
- Modified spec: `finished-attempt-list` — no behaviour change required, but a follow-up note added so the "Lihat Pembahasan" card can later show rank badge (out of scope for v1).

## Capabilities

### New Capabilities

- `per-tryout-ranking`: API contract, caching strategy, component shell, tab/sub-tab state machine, top-3 confetti trigger, sticky your-row.

### Modified Capabilities

- None for v1. `finished-attempt-list` only gets a future-looking comment; no requirement delta in this change.

## Impact

- **Code**: `app/(user)/tryout/[attemptId]/page.tsx` (no change — already routes to `TryoutReviewMode` when finished), `components/tryout/TryoutReviewMode.tsx` (add tab state + Ranking tab body), `lib/ranking.ts` (new `getTryoutRanking` + `getUserTryoutRank`), new `app/api/tryouts/[tryoutId]/ranking/route.ts`.
- **Components**: existing `RankingClient` primitives (Podium, RankingRow, TabBar) reused inside a new `TryoutRankingPanel` client component.
- **API**: 1 new route, follows existing `requireActiveSession` guard. `tryoutId` already in JWT-loaded attempt payload so no extra DB roundtrip.
- **Perf**: TTL cache (5 min) on the ranking list per `(tryoutId, period)` tuple. Cache invalidated on attempt submit by bumping a small `ranking_version` row in memory (process-local; we re-fetch and re-cache on miss). No new DB columns; no new tables.
- **UX**: confetti is a one-time client-side event; `canvas-confetti` (or equivalent ~6kb) added as a dep. Easy to swap or remove.
- **Out of scope**: rank badge on `finished-attempt-list` cards, comparison vs previous attempt, weekly/monthly toggle persistence, sharing rank to social.
