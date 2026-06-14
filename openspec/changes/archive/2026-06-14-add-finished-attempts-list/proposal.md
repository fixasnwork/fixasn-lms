## Why

On the tryout page (`app/(user)/tryout/page.tsx`) the user can see the packages they own and start/resume attempts, but once an attempt is finished there is no quick way to revisit the pembahasan (review) of that attempt from the tryout page. Users have to dig into their attempt history elsewhere or rely on the URL bar. We want a dedicated "Daftar Tryout Selesai" section at the bottom of the page that lists every **finished** attempt belonging to a tryout in a currently-active package the user has paid for, with one-tap navigation back to the pembahasan screen for that attempt.

The semantic problem to solve first: today there is no reliable "finished" signal on `TryoutAttempt`. The runner pages use `totalScore > 0` as a proxy, but a finished attempt where the user got every question wrong would have `totalScore === 0` and be wrongly classified as in-progress. We need a proper `finishedAt` timestamp on the row.

## What Changes

- Add a nullable `finishedAt DateTime?` column to `TryoutAttempt` (DB schema migration).
- Set `finishedAt = new Date()` in the `PUT /api/tryout-attempts/[attemptId]` write path whenever the PUT writes scores (i.e. the runner hit `onFinish`). The flag-only path and the answer-only path do **not** touch `finishedAt`. An existing attempt's `finishedAt` is backfilled to `updatedAt` for the rows that already had `totalScore > 0` written at some point — but the spec treats the column as `null` for in-progress, so the list relies on the new field.
- Extend the GET path on the same endpoint to return `finishedAt` so `TryoutReviewMode` and any consumer can read it.
- Extend `useAttemptHistory` to expose `finishedAt` per attempt.
- Add a new section at the **bottom** of `/tryout` titled "Daftar Tryout Selesai" that lists, in a single full-width column, one card per finished attempt whose parent tryout belongs to a currently-active, user-owned package.
- Each card shows: tryout name, package name, finished date (`finishedAt`), best score across attempts for that tryout, and a single "Lihat Pembahasan" button that navigates to `/tryout/[attemptId]` (the existing review screen, which already shows for `totalScore > 0`).
- Cards span the full page width (single column, max-width matched to the page container), one per row.
- The list excludes:
  - Attempts with `finishedAt == null` (in-progress).
  - Attempts whose tryout belongs to a package that is **not** currently active (`isPackageAvailable(package) === false`).
  - Attempts whose tryout belongs to a package the user has **not** paid for (no `verified`/`pending` payment).
  - Trial attempts are fine to include if the user has actually finished one.

## Capabilities

### New Capabilities

- `finished-attempt-list`: User can see, on `/tryout`, a full-width list of cards representing every finished tryout attempt in a currently-active package they own. Each card has a "Lihat Pembahasan" button that navigates to the existing review screen for that attempt. Driven by a new `finishedAt` column on `TryoutAttempt` to distinguish finished from in-progress.

### Modified Capabilities

_None._ No existing spec requirement changes. The `tryout-page-view` spec gets a new section (added via this new capability) but its existing requirements are unchanged.

## Impact

**Code:**
- `prisma/schema.prisma` — add `finishedAt DateTime?` to `TryoutAttempt`.
- `prisma/migrations/YYYYMMDD_add_attempt_finished_at/migration.sql` — `ALTER TABLE "tryoutAttempts" ADD COLUMN "finishedAt" TIMESTAMPTZ(6);`.
- `app/api/tryout-attempts/[attemptId]/route.ts` — on PUT, when `body.answers` (and therefore a new score) is supplied, set `finishedAt = new Date()` if not already set; on GET, include `finishedAt` in the response.
- `app/api/tryout-attempts/route.ts` (GET) — include `finishedAt` in the list response.
- `app/(user)/tryout/page.tsx` — compute `finishedAttempts` list and render the new section at the bottom.
- `hooks/useTryoutQueries.ts` — `useAttemptHistory` return type gains `finishedAt: string | null` per attempt.
- `lib/types.ts` — `TryoutAttempt.finishedAt: string | null` (mirrors existing `createdAt`/`updatedAt` style).
- A new component `components/tryout/FinishedAttemptCard.tsx` for each card (testable, composable).

**DB:**
- One new nullable column on `tryoutAttempts`. Migration is online-safe (nullable, no default rewrite). Existing rows get `finishedAt = null`. No backfill — the backfill would be guesswork and the user only sees attempts that they finish going forward.

**APIs:**
- `GET /api/tryout-attempts/[attemptId]` response gains `finishedAt: string | null` in `attempt`.
- `GET /api/tryout-attempts?userId=...` response (attempt list) gains `finishedAt: string | null` per attempt.
- `PUT /api/tryout-attempts/[attemptId]` no new request body fields; the server sets `finishedAt` automatically when scores are being written.

**Dependencies / Systems:** None new. Uses existing Prisma, TanStack Query, NextAuth.

**Tests:**
- Unit: `app/api/tryout-attempts/[attemptId]/route.test.ts` — score-writing PUT sets `finishedAt`, flag-only PUT does not, GET returns it.
- Component: `FinishedAttemptCard.test.tsx` — renders name, package, date, score, button; navigates on click.
- Page: `app/(user)/tryout/page.tsx` integration test (or render test) — finished attempts from inactive or unowned packages are excluded.
