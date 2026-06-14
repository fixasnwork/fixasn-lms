## 1. Schema

- [x] 1.1 Add `finishedAt DateTime?` to `TryoutAttempt` in `prisma/schema.prisma`
- [x] 1.2 Add `migration_lock.toml` if missing and run `npx prisma migrate dev --name add_attempt_finished_at` (or hand-author the SQL migration + add the lock file in line with the existing repo style)
- [x] 1.3 Run `npx prisma generate` to refresh the client

## 2. Shared types

- [x] 2.1 Extend `TryoutAttempt` in `lib/types.ts` with `finishedAt: string | null`
- [x] 2.2 Extend the inline `useAttemptHistory` return type in `hooks/useTryoutQueries.ts` with `finishedAt: string | null` per attempt

## 3. API: read path (GET)

- [x] 3.1 In `app/api/tryout-attempts/[attemptId]/route.ts` GET, include `finishedAt` in the response (mapped from `attempt.finishedAt?.toISOString() ?? null`)
- [x] 3.2 In `app/api/tryout-attempts/route.ts` GET, include `finishedAt` in each attempt row (included automatically by Prisma — no mapping change needed)
- [x] 3.3 Verify the response shape matches the client types

## 4. API: write path (PUT)

- [x] 4.1 In `app/api/tryout-attempts/[attemptId]/route.ts` PUT, detect a "score-writing" request (presence of `body.answers` or any of the four score fields) and set `finishedAt = new Date()` only when `existing.finishedAt` is null
- [x] 4.2 Ensure flag-only PUTs (no `answers`, no scores) do not modify `finishedAt`
- [x] 4.3 Ensure re-submits of a finished attempt do not overwrite the original `finishedAt`

## 5. Runner gating

- [x] 5.1 In `app/(user)/tryout/[attemptId]/page.tsx`, change `isCompleted` from `attempt.totalScore > 0` to `!!attempt.finishedAt`
- [x] 5.2 Verify `TryoutReviewMode` and `TryoutEngine` branches are still reachable for their respective cases

## 6. New component: FinishedAttemptCard

- [x] 6.1 Create `components/tryout/FinishedAttemptCard.tsx` with props `{ attemptId, tryoutName, packageName, finishedAt, totalScore, twkScore, tiuScore, tkpScore, onView }`
- [x] 6.2 Render full-width card with tryout name, package name, formatted finished date, score breakdown
- [x] 6.3 Include a single "Lihat Pembahasan" primary button that calls `onView()` (navigates to `/tryout/[attemptId]`)
- [x] 6.4 Style the card to match the existing "Paket Tryout Kamu" visual language but with a distinct accent color (purple/teal)

## 7. Tryout page: list section

- [x] 7.1 In `app/(user)/tryout/page.tsx`, compute `ownedPkgIds` (already exists) and `activeOwnedPkgIds` (intersect with `isPackageAvailable`)
- [x] 7.2 Build a lookup `Map<number, Tryout & { packageId, packageName }>` from `tryoutBanks` and `packages`
- [x] 7.3 Compute `finishedAttempts` = `attemptHistory.filter(a => a.finishedAt && activeOwnedPkgIds.has(tryoutById.get(a.tryoutId).packageId))`, sorted by `finishedAt` desc
- [x] 7.4 Render a new section at the bottom of the page titled "Daftar Tryout Selesai" with a vertical stack of `FinishedAttemptCard` items
- [x] 7.5 Add an empty state when `finishedAttempts.length === 0`
- [x] 7.6 Wire the "Lihat Pembahasan" button to `router.push(\`/tryout/${attemptId}\`)`

## 8. Tests

- [x] 8.1 Update `app/api/tryout-attempts/[attemptId]/route.test.ts` — score-writing PUT sets `finishedAt`, flag-only PUT does not, GET returns `finishedAt`
- [x] 8.2 Update `app/api/tryout-attempts/route.test.ts` (or extend it) — list response includes `finishedAt` (auto-included by Prisma, no mapping change needed)
- [x] 8.3 Add `components/tryout/FinishedAttemptCard.test.tsx` — renders name, package, date, scores, button; calls `onView` on click
- [x] 8.4 Add a render test for `app/(user)/tryout/page.tsx` (or a focused unit test of the filter logic) — finished attempts from inactive or unowned packages are excluded
- [x] 8.5 Run `npm run test`, `npm run lint`, `npm run build` and ensure all pass

## 9. Docs and cleanup

- [x] 9.1 Update `AGENTS.md` / `TODO.md` if they reference the "completed = totalScore > 0" heuristic
- [x] 9.2 Verify no other consumer relies on `totalScore > 0` to mean "finished"
- [x] 9.3 Run a final `npm run test` + `npm run lint` + `npm run build`
