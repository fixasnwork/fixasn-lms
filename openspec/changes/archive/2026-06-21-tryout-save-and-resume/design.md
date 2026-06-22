## Context

The tryout runner (`components/tryout/TryoutEngine.tsx`) currently has two terminal actions: the **Finish** button (submits scores, stamps `finishedAt`, ends the timer) and the natural **timer expiry** path (same). There is no way to leave the runner and come back — closing the tab loses the remaining timer, and the page redirect on `onFinish` keeps users on the result view, not back at the tryout list.

The autosave spec (`tryout-answer-autosave`) already guarantees that answers are flushed every 60s and on visibility/unload. The `/api/tryout-attempts/resume` route already returns the latest in-progress attempt (where `finishedAt === null`) instead of minting a new one. So the **resume-on-reopen** path is already half-wired — the only thing missing is timer continuity.

What this change adds:

1. A deliberate user-initiated save-and-exit path with confirmation.
2. Server-side persistence of remaining time so the timer continues from where it stopped, not from `durationMin * 60`.
3. A small UX cue on `/tryout` so users know there is something to resume.

## Goals / Non-Goals

**Goals:**

- One-click save-and-exit from the runner with a confirmation step.
- Remaining timer is recoverable across reloads, tab closes, and device switches (as long as the session is still valid).
- Resume restores the same `cur` (current question index) and `answers` state — this is already handled by the existing `useAttempt` rehydration; we only need to extend it to the timer.
- The list page surfaces in-progress attempts.

**Non-Goals:**

- Multi-device concurrent resume. Last-writer-wins on the timer field is acceptable.
- Cross-tab live sync (e.g. opening the same attempt in two tabs). The autosave hook already refetches on `visibilitychange → visible`, which is sufficient.
- Changing the resume API's behavior. It already returns the in-progress attempt; we just enrich its payload.
- Adding pause/resume controls beyond the save-and-exit button. No "Pause" toggle.

## Decisions

### D1. Store `timeLeftSeconds` on `TryoutAttempt`, not on a separate `AttemptSession` table

A separate session table adds a join, a lifecycle (start/stop events), and a foreign key for what is effectively one integer. The attempt already has a 1:1 mapping with the user's current run (one in-progress attempt per `(userId, tryoutId)` because `resume` returns the latest), so the column lives directly on the attempt.

**Alternative considered**: a `pauseEvents: DateTime[]` array plus the original `startedAt`. Compute remaining time on read with `durationMin*60 - sum(intervals)`. Rejected: more state to keep consistent, and the engine only needs the _current_ remaining time, not history.

### D2. Put `timeLeftSeconds` in the same PUT body as the autosave answers

The autosave hook already debounces and flushes answer maps. Extending its body to include `timeLeftSeconds` reuses the same network path and the same 60s cadence. No new mutation, no new endpoint.

The save-and-exit action flushes once (no debounce), awaits success, then navigates.

### D3. Confirmation modal for save-and-exit

Save-and-exit is reversible (the user can resume) but is the only "exit without scoring" path. A two-tap confirmation prevents accidental clicks. The modal also shows the current remaining time and answered count so the user can make an informed decision.

### D4. Seed `timeLeft` from server only on resume, not on a fresh attempt

`/api/tryout-attempts/resume` returns `{ attempt: { id, tryoutId, isNew } }`. When `isNew === true` (fresh attempt), `timeLeftSeconds` is null → engine falls back to `DURATION = durationMin * 60`. When `isNew === false`, the attempt was in-progress and `timeLeftSeconds` carries the saved value → engine seeds the timer from it.

**Alternative considered**: always read `timeLeftSeconds` from `GET /api/tryout-attempts/[id]` (which the page already calls). Rejected: `/resume` is the cheaper, single round-trip entry point and the runner can read the value before constructing the engine.

To make this work without an extra refetch, extend the `/resume` POST response with `timeLeftSeconds: number | null`, plumb it through `useCreateOrResumeAttempt` and the `[attemptId]/page.tsx` mount flow.

### D5. No `startedAt` column

Could add `startedAt` for an audit trail, but it adds no functional value for the timer (we already store `createdAt` on the attempt row, which is when the attempt was created — effectively when the user first hit Mulai). Skip.

## Risks / Trade-offs

- **[Risk] Stale `timeLeftSeconds` after long absences**: if a user starts an attempt, the autosave never flushes because no answer was changed, and they come back a week later, the timer keeps ticking from server `updatedAt` perspective but the client just reads the stored value. **Mitigation**: the server does NOT auto-decrement the timer on read. This is a deliberate simplification — a paused attempt stays paused in the stored value, and the timer picks up exactly where it stopped on resume. The trade-off is documented in the spec: the "real-world" remaining time drifts upward the longer the user is away. Acceptable for an SKD tryout use case where the window is short.
- **[Risk] Confusing UX if `cur` is reset on resume**: `cur` is local React state, not persisted. On full reload, the user lands on question 1, not where they left off. **Mitigation (out of scope here)**: add a `lastQuestionIndex` field in a follow-up. For now, document the behavior.
- **[Risk] Modal blocks tab back/forward**: the confirmation uses a real `<Modal>` portal with a backdrop, so accidental keyboard navigation can't bypass it. Escape closes the modal, not the page.

## Migration Plan

1. `npx prisma migrate dev --name add_attempt_time_left_seconds` — creates migration adding nullable `timeLeftSeconds Int?` to `tryout_attempts`. Backfill is unnecessary (existing rows are finished or stale; null is the safe default).
2. Deploy code behind the new column. Existing attempts with `timeLeftSeconds = null` are treated as fresh attempts (full duration) on the next `GET` — acceptable because they are either already-finished (won't hit the running phase) or were started before this feature and have no saved time.
3. No data backfill. No rollback concern beyond dropping the new column.

## Open Questions

- Should the runner's "Simpan & Keluar" button also be available on the **ready** phase (before the user has started)? Decision: no — the user has nothing to save yet. The button only renders in the **running** phase.
- Should `/tryout` show a separate "Sedang Berjalan" section above the package list, or just badge the affected tryout? Decision: badge the affected tryout row with "Lanjutkan", and surface a banner above the package list when at least one in-progress attempt exists. Minimal UI surgery.
