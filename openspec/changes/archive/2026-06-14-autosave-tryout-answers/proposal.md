## Why

Today, the tryout runner saves answers to the server **only** when the user clicks "Selesai" or the timer hits zero (the `onFinish` path in `app/(user)/tryout/[attemptId]/page.tsx`). If the user closes the tab, refreshes, loses their connection, or simply navigates away before finishing, every answer selection is lost — the next visit shows a blank runner again. The only thing that survives mid-attempt today is the Ragu-ragu flag (which has its own debounced PUT).

We want the runner to autosave answer selections to the server so the user can resume any time without losing work, with the server treated as the source of truth (so a refresh rehydrates from the latest server state).

## What Changes

- Add a 60-second autosave cadence in the tryout runner: any time a new answer is selected and there is no autosave timer currently running, schedule a PUT for 60 seconds in the future with the current full answer map. **Do not reset the timer if one is already running** — the cadence is fixed at 60s from the first change.
- Force-flush on critical lifecycle events: `visibilitychange` (tab hidden), `pagehide`/`beforeunload` (tab closing), and component unmount.
- The flush uses `navigator.sendBeacon` for `pagehide`/`beforeunload` (it can't be blocked by browser unload), and `fetch` for everything else.
- Server: no changes. The existing `PUT /api/tryout-attempts/[attemptId]` already accepts a partial `answers` body and upserts `AttemptAnswer` rows. The autosave reuses that endpoint with the same shape `useUpdateAttempt` uses today.
- The runner is the source of truth for the **in-session** view (optimistic); the server is the source of truth on **mount/rehydration**. On mount, the engine hydrates from `useAttempt`'s `answers` (already wired). On `visibilitychange`/`focus`, the engine re-fetches via `queryClient.invalidateQueries(['attempt', attemptId])` and reconciles. Last-write-wins across tabs.
- `useUpdateAttempt` is preserved as the **finish-time** path: it still writes scores and the final `answers` map in one shot. Autosave writes **only** `answers` (no scores), so the `finishedAt` column from the previous change is untouched.
- Ragu-ragu autosave (existing debounced writer in `useUpdateAttemptFlags`) is unaffected. The two autosave streams share the same endpoint but write disjoint keys.

## Capabilities

### New Capabilities

- `tryout-answer-autosave`: The tryout runner automatically persists the user's answer selections to the server at most every 60 seconds, with force-flush on visibility/unload events, and reconciles from the server on remount and visibility regain. The server is the source of truth on rehydration; last-write-wins across tabs.

### Modified Capabilities

_None._ No existing spec requirements change. The new capability is purely additive.

## Impact

**Code:**
- `components/tryout/TryoutEngine.tsx` — add an `autosaveAnswers` `useEffect` (60s cadence with no-reset), `visibilitychange`/`pagehide` listeners, sendBeacon on unload.
- `hooks/useTryoutQueries.ts` — add a `useUpdateAttemptAnswers(attemptId)` mutation (PUT with only `answers`); extend the existing `useAttempt` query with a manual `refetch` callback or rely on `queryClient.invalidateQueries`.
- Server: no code changes required. The existing PUT handler at `app/api/tryout-attempts/[attemptId]/route.ts` already supports `{ answers }`-only bodies.

**APIs:**
- No new endpoints. The existing `PUT /api/tryout-attempts/[attemptId]` is reused.

**DB:**
- No schema changes. The `AttemptAnswer` table already supports per-question upserts.

**Dependencies / Systems:** None new. Uses existing `fetch`, `navigator.sendBeacon`, TanStack Query, and the Prisma layer.

**Tests:**
- Unit: a `useUpdateAttemptAnswers` hook test verifying it sends `{ answers }` only and merges optimistically.
- Component: a focused test for the autosave effect cadence (mock timers, verify "no reset when timer running", "reset to 60s when no timer", "force-flush on visibility change").
- Optional integration: a render test of the runner verifying the autosave effect is wired.
