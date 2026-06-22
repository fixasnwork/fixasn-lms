## Why

The runner currently forces the user to finish in one continuous session. Closing the tab, hitting back, or losing the page discards whatever time remains and any unsaved work — even though answers are autosaved every 60 seconds. Users need a deliberate "save and exit" path that preserves their remaining time and answer state, and the list page must let them pick up an in-progress attempt where they left off.

## What Changes

- Add a **"Simpan & Keluar"** button inside the runner (`TryoutEngine`), gated behind a confirmation modal, that flushes all in-memory state (answers, ragu-ragu flags, remaining time) to the server and navigates back to `/tryout` without scoring.
- Persist the **remaining timer seconds** server-side on every autosave and on save-and-exit so resume restores the exact countdown.
- On the list page (`app/(user)/tryout/page.tsx`), the **"Mulai / Lanjutkan"** button is already wired through `useCreateOrResumeAttempt`, which returns an existing in-progress attempt when `finishedAt` is null. Add a visible hint when an in-progress attempt exists for a tryout so users know there is something to resume.
- On the attempt page (`app/(user)/tryout/[attemptId]/page.tsx`), when an in-progress attempt is reopened, the engine seeds `timeLeft` from the server value instead of the full `durationMin * 60`.
- `POST /api/tryout-attempts/resume` already returns the in-progress attempt by `finishedAt === null`. We extend its response payload (additive, non-breaking) with `timeLeftSeconds: number | null` so the page can seed the timer without an extra round-trip. The GET endpoint also returns `timeLeftSeconds`.

## Capabilities

### New Capabilities

- `tryout-save-and-resume`: explicit user-initiated save-and-exit flow + persistence of remaining timer state across sessions, and the resume-restore behavior on reopen.

### Modified Capabilities

- `tryout-answer-autosave`: autosave now also carries `timeLeftSeconds` on every PUT so the timer is recoverable on the next mount.

## Impact

- **Schema**: add nullable `timeLeftSeconds Int?` to `TryoutAttempt`. New migration under `prisma/migrations/`.
- **API**:
  - `GET /api/tryout-attempts/[attemptId]` — add `timeLeftSeconds` to the returned `attempt` object.
  - `PUT /api/tryout-attempts/[attemptId]` — accept optional `timeLeftSeconds: number` and persist it. Non-score PUTs remain non-destructive of `finishedAt`.
- **Client**:
  - `hooks/useAutosaveAnswers.ts` — include `timeLeftSeconds` in every answer-map PUT body.
  - `hooks/useTryoutQueries.ts` — `useUpdateAttemptAnswers` mutation accepts `timeLeftSeconds`; add a `useSaveAndExit` (or extend `useUpdateAttempt`) mutation that flushes answers + flags + timer in one call.
  - `components/tryout/TryoutEngine.tsx` — new `onExit?` prop; new "Simpan & Keluar" button on the running-phase header bar with a confirm modal; seed `timeLeft` from a new `initialTimeLeftSeconds?: number` prop when present and `preloadedAnswers` is non-empty (i.e. resume).
  - `app/(user)/tryout/[attemptId]/page.tsx` — pass `initialTimeLeftSeconds={attempt.timeLeftSeconds ?? undefined}` and `onExit={() => router.push('/tryout')}`.
  - `app/(user)/tryout/page.tsx` — show "Lanjutkan" instead of "Mulai" for tryouts with an in-progress attempt; highlight the matching tryout in the package list. Surface the in-progress state on the relevant tryout row.
- **Types**: extend `Attempt` interface in `lib/types.ts` with `timeLeftSeconds?: number | null`.
- **Tests**: extend `useAutosaveAnswers.test.ts` for the timer field; add a `TryoutEngine` test for the Simpan & Keluar modal flow and resume seeding.
