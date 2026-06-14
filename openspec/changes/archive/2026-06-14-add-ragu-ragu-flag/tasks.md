## 1. Schema

- [x] 1.1 Add `raguRagu Boolean @default(false)` to `AttemptAnswer` in `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add_attempt_answer_ragu_ragu` and verify migration file

## 2. Shared types

- [x] 2.1 Extend `AttemptAnswer` (or equivalent) in `lib/types.ts` with `raguRagu: boolean`
- [x] 2.2 Add `RaguRaguFlags = Record<number, boolean>` to `lib/types.ts` for the wire payload
- [x] 2.3 Update `useTryoutQueries` `useAttempt` return type to include `raguRagu` per question (or a sibling `raguRaguFlags` record)

## 3. API: read path (GET)

- [x] 3.1 In `app/api/tryout-attempts/[attemptId]/route.ts` GET, include `raguRagu` in the `answers` payload (or return a sibling `raguRaguFlags: Record<number, boolean>`)
- [x] 3.2 Verify the response shape matches the client types

## 4. API: write path (PUT)

- [x] 4.1 In `app/api/tryout-attempts/[attemptId]/route.ts` PUT, accept optional `raguRaguFlags: Record<number, boolean>` in the request body
- [x] 4.2 Build upsert rows that write `raguRagu` without disturbing `selectedOption` when only the flag is sent
- [x] 4.3 Treat absent keys as no-op (do not clear existing flags implicitly)
- [x] 4.4 Update the `mapQuestion`/answer mapping if needed so the GET response stays consistent after a flag-only write

## 5. Client hooks

- [x] 5.1 Add `useUpdateAttemptFlags(attemptId)` hook in `hooks/useTryoutQueries.ts` calling `PUT /api/tryout-attempts/[attemptId]` with `{ raguRaguFlags }`
- [x] 5.2 Debounce the mutation (200-300ms) to coalesce rapid toggles
- [x] 5.3 Invalidate the `useAttempt` query key on success so the palette reflects server state

## 6. UI: question card

- [x] 6.1 In `components/tryout/TryoutEngine.tsx` (or sub-component), add a "Tandai Ragu-ragu" / "Batalkan Ragu-ragu" button below the answer options
- [x] 6.2 Wire the button to `useUpdateAttemptFlags` for the current `questionIndex`
- [x] 6.3 Maintain a local `Set<number>` of flagged indices, hydrated from server data on mount
- [x] 6.4 Apply yellow border + flag icon + "Ragu-ragu" label to the question card when flagged
- [x] 6.5 Remove the yellow styling when the flag is cleared

## 7. UI: nav palette

- [x] 7.1 Locate the question number palette component (inside `TryoutEngine` or a sibling)
- [x] 7.2 Render a small yellow dot indicator on each tile whose `questionIndex` is in the flagged set
- [x] 7.3 Ensure the dot does not affect the tile's click target or accessibility label

## 8. UI: result review

- [x] 8.1 In `components/tryout/TryoutReviewMode.tsx`, accept a `raguRaguFlags` prop (read-only)
- [x] 8.2 Render a yellow "Ragu-ragu" pill next to the question number for flagged questions
- [x] 8.3 Pass `raguRaguFlags` from `app/(user)/tryout/[attemptId]/page.tsx` into `TryoutReviewMode`
- [x] 8.4 Add a summary stat card: "X dari Y soal ditandai Ragu-ragu" alongside the existing score cards

## 9. Tests

- [x] 9.1 Add/adjust unit test for `app/api/tryout-attempts/[attemptId]/route.ts` PUT — flag write, flag-only write preserves `selectedOption`, GET returns flags
- [x] 9.2 Add a component test for the flag toggle button (calls mutation, updates local state, applies styling)
- [x] 9.3 Add a component test for the nav palette dot (renders for flagged indices, absent for unflagged)
- [x] 9.4 Add a test for `TryoutReviewMode` summary stat ("X dari Y soal ditandai Ragu-ragu")
- [x] 9.5 Verify `npm run test`, `npm run lint`, `npm run build` all pass

## 10. Docs and cleanup

- [x] 10.1 Update `AGENTS.md` / `TODO.md` if they reference the answer payload shape
- [x] 10.2 Verify no stale references to old `answers` shape in any consumer
- [x] 10.3 Run a final `npm run test` + `npm run lint` + `npm run build` before merge
