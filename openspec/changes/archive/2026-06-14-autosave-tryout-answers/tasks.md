## 1. Hook: `useUpdateAttemptAnswers`

- [x] 1.1 Add `useUpdateAttemptAnswers(attemptId)` to `hooks/useTryoutQueries.ts` — `useMutation` that PUTs `{ answers }` only, with optimistic merge into the `['attempt', attemptId]` cache and rollback on error
- [x] 1.2 Add `useSendBeaconAnswers(attemptId)` helper (or inlined in engine) that fires `navigator.sendBeacon` with the JSON body Blob; no await, no error handling
- [x] 1.3 Ensure the mutation invalidates the `['attempt', attemptId]` query on settle so the next rehydrate is fresh

## 2. Engine: autosave cadence effect

- [x] 2.1 In `components/tryout/TryoutEngine.tsx`, add a `useRef<ReturnType<typeof setTimeout> | null>` for the autosave timer
- [x] 2.2 Add a `useEffect` that watches `answers` and, when no timer is running and `phase === 'running'` and `timeLeft >= 5000`, schedules a 60s `setTimeout` that calls a `flushAnswers()` function
- [x] 2.3 Implement `flushAnswers()`: if `attemptId` is set, call `useUpdateAttemptAnswers.mutate(answers)`. Clear the timer ref before/after firing
- [x] 2.4 Skip the schedule when `Object.keys(answers).length === 0` (no answers to save)

## 3. Engine: force-flush on lifecycle events

- [x] 3.1 Add a `useEffect` that registers `visibilitychange`, `pagehide`, and `beforeunload` listeners on mount and cleans them up on unmount
- [x] 3.2 In the `visibilitychange` handler, if `document.visibilityState === 'hidden'`, call `flushAnswers()` (regular `fetch`)
- [x] 3.3 In the `pagehide` / `beforeunload` handler, call the `sendBeacon` flush with the current `answers` (fire-and-forget)
- [x] 3.4 Add a cleanup in the same effect: on unmount, call `flushAnswers()` to persist any unflushed changes

## 4. Engine: rehydrate on visibility regain

- [x] 4.1 In the `visibilitychange` handler, if `document.visibilityState === 'visible'`, call `queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] })`
- [x] 4.2 Ensure the existing `useAttempt` re-fetch flows back into the engine's `answers` state via the existing `preloadedAnswers` hydration path (engine reads `attempt.answers` from the query)

## 5. Engine: phase guard

- [x] 5.1 In the autosave effect, gate the schedule on `phase === 'running'`
- [x] 5.2 When phase transitions to `result` (after finish), cancel any pending autosave timer
- [x] 5.3 Skip scheduling when `timeLeft < 5000` (let the finish path handle the final write)

## 6. Tests

- [x] 6.1 Add a hook test for `useUpdateAttemptAnswers` — verifies PUT body shape, optimistic merge, rollback on error
- [x] 6.2 Add a focused test for the autosave cadence logic — verifies "no reset when timer running", "reset to 60s when no timer", "skip when no answers", "skip when phase != running", "skip when timeLeft < 5000"
- [x] 6.3 Add a test for the lifecycle flush — verify `visibilitychange` and `pagehide` handlers call the right flush function (mock `navigator.sendBeacon` and `fetch`)
- [x] 6.4 Run `npm run test`, `npm run lint`, `npm run build` and ensure all pass

## 7. Docs and cleanup

- [x] 7.1 Update `AGENTS.md` if it references the "answers only saved on finish" behavior
- [x] 7.2 Verify no other consumer relies on answers being un-saved mid-attempt
- [x] 7.3 Run a final `npm run test` + `npm run lint` + `npm run build`
