## 1. Schema

- [x] 1.1 Add `timeLeftSeconds Int?` to `TryoutAttempt` in `prisma/schema.prisma` with a comment describing the contract (null = fresh attempt or legacy row; integer = remaining seconds at last flush).
- [x] 1.2 Create migration `npx prisma migrate dev --name add_attempt_time_left_seconds` and verify it applies cleanly against a fresh DB.

## 2. API

- [x] 2.1 Extend `GET /api/tryout-attempts/[attemptId]` to include `timeLeftSeconds: number | null` in the returned `attempt` object (`app/api/tryout-attempts/[attemptId]/route.ts`).
- [x] 2.2 Extend `PUT /api/tryout-attempts/[attemptId]` to accept optional `timeLeftSeconds: number` in the body, clamp to `[0, durationMin*60]`, and persist via `prisma.tryoutAttempt.update`. Do NOT touch this field when the body omits it. Do NOT coerce `finishedAt` on a timer-only write (`app/api/tryout-attempts/[attemptId]/route.ts`).
- [x] 2.3 Extend `POST /api/tryout-attempts/resume` response to include `timeLeftSeconds: number | null` on the returned `attempt` for both the resume-existing and create-new paths (`app/api/tryout-attempts/resume/route.ts`).
- [x] 2.4 Update existing route test (`app/api/tryout-attempts/[attemptId]/route.test.ts` if present) to cover `timeLeftSeconds` round-trip; add at minimum a happy-path test for PUT-with-timer and GET-returns-timer.

## 3. Types and Hooks

- [x] 3.1 Add `timeLeftSeconds?: number | null` to the `Attempt` interface in `lib/types.ts`.
- [x] 3.2 Update `useCreateOrResumeAttempt` in `hooks/useTryoutQueries.ts` to surface `timeLeftSeconds` on the returned attempt (typed via the new field).
- [x] 3.3 Update `useUpdateAttemptAnswers` mutation in `hooks/useTryoutQueries.ts` to accept `timeLeftSeconds` and include it in the PUT body.
- [x] 3.4 Update `useAutosaveAnswers` in `hooks/useAutosaveAnswers.ts` to include `timeLeftSeconds` in every PUT body (60s flush, visibility hidden, unmount, sendBeacon) using the latest `timeRef` snapshot.
- [x] 3.5 Extend `useAutosaveAnswers.test.ts` to assert `timeLeftSeconds` is present on each flush path.

## 4. Engine UI and State

- [x] 4.1 Add `initialTimeLeftSeconds?: number | null` and `onExit?: () => void` to `TryoutEngineProps` in `components/tryout/TryoutEngine.tsx`.
- [x] 4.2 Seed `timeLeft` from `initialTimeLeftSeconds` when provided AND `Object.keys(preloadedAnswers).length > 0` (resume); fall back to `DURATION` otherwise.
- [x] 4.3 Add a header-bar "Simpan & Keluar" button in the running phase that opens a confirmation modal. Use the existing `Modal` UI primitive.
- [x] 4.4 Build the confirmation modal body: show "X / N soal dijawab" and the current remaining time (`formatTime(timeLeft)`). Provide "Batal" and "Simpan & Keluar" actions; "Batal" closes the modal, "Simpan & Keluar" sends a flush and calls `onExit`.
- [x] 4.5 Wire the confirm action: send a single PUT via the existing `useUpdateAttemptAnswers` (with answers + `timeLeftSeconds` + ragu-ragu flush via `useUpdateAttemptFlags`) and only call `onExit` on success. On error, surface a non-blocking error and keep the modal open.
- [x] 4.6 Add a unit test for the engine in `components/tryout/TryoutEngine.test.tsx` (new file if absent) covering: timer seeded from `initialTimeLeftSeconds`, modal opens on button click, cancel does not call `onExit`, confirm calls `onExit` after PUT success.

## 5. Page Wiring

- [x] 5.1 In `app/(user)/tryout/[attemptId]/page.tsx`, when an in-progress attempt is detected (finishedAt is null), pass `initialTimeLeftSeconds={attempt.timeLeftSeconds ?? null}` and `onExit={() => router.push('/tryout')}` to `TryoutEngine`.
- [x] 5.2 In `app/(user)/tryout/page.tsx`, build a `Map<tryoutId, AttemptHistory>` of in-progress attempts and use it to:
  - Show a "Lanjutkan" label and `(X soal dijawab)` hint on the matching tryout button.
  - Render a small banner above the owned-packages section when at least one in-progress attempt exists, linking back into it.
- [x] 5.3 Verify the existing `useCreateOrResumeAttempt` flow lands the user in the running engine with the saved timer by walking through `/tryout → Mulai → leave via Simpan & Keluar → click Lanjutkan`.

## 6. Verification

- [x] 6.1 Run `npm run lint` and resolve any new warnings.
- [x] 6.2 Run `npm run test` and ensure the new + updated tests pass; add coverage for the timer persistence and save-and-exit flows.
- [x] 6.3 Run `npm run build` to confirm the schema change does not break the build.
- [x] 6.4 Manual smoke: start a tryout, answer 5 questions, hit Simpan & Keluar, confirm the modal, return to `/tryout`, click Lanjutkan, verify the timer shows the remaining minutes/seconds and the answered questions are still selected.
