## Context

The tryout page (`app/(user)/tryout/page.tsx`) currently shows the trial card, available (unpurchased) packages, and owned packages with per-tryout Mulai buttons. Once a user finishes an attempt, the only way to revisit the pembahasan is to navigate directly to `/tryout/[attemptId]` and rely on the `totalScore > 0` heuristic to enter review mode. The user has no in-page shortcut back to pembahasan for past attempts, and the runner has no explicit "finished" signal — `totalScore > 0` misses finished-zero-score attempts.

Stakeholders: end users (faster access to pembahasan of past attempts); product (a foundation for per-attempt review affordances later).

## Goals / Non-Goals

**Goals:**
- Distinguish finished from in-progress attempts reliably via a new `finishedAt` timestamp.
- Render a "Daftar Tryout Selesai" section at the bottom of `/tryout`, full-width single-column cards, one per finished attempt.
- Each card has a single "Lihat Pembahasan" button that navigates to `/tryout/[attemptId]` (the existing review screen, which will now check `finishedAt` instead of `totalScore > 0`).
- Filter the list to attempts whose parent tryout is in a currently-active, user-owned package.

**Non-Goals:**
- No retry / mulai-ulang button on the cards in v1.
- No per-question history, no per-question pembahasan filter UI in this change.
- No analytics on attempt timing (when started vs finished).
- No admin view of finished attempts.

## Decisions

### Decision 1: New `finishedAt: DateTime?` column on `TryoutAttempt`

**Why:** A real field beats heuristics. `totalScore > 0` is wrong for zero-score finishes; `updatedAt > createdAt` is wrong because the new Ragu-ragu `useUpdateAttemptFlags` mutation can bump `updatedAt` without finishing. A nullable column is online-safe and the meaning is self-evident.

**Alternatives considered:**
- Use `updatedAt === createdAt` as the inverse heuristic — rejected, breaks on flag toggles.
- Use `answersCount === questionsCount` — rejected, requires a per-question count and a separate join.
- Use a `status` enum (e.g. `in_progress | finished`) — viable but heavier; `finishedAt` is the smallest signal that also gives us a timestamp.

### Decision 2: Server sets `finishedAt` automatically when scores are being written

**Why:** The runner already calls `PUT /api/tryout-attempts/[attemptId]` with `twk/tiu/tkp/totalScore + answers` exactly once per `onFinish`. The server can detect "this is a score-writing PUT" by the presence of the `answers` body (or any of the four score fields) and stamp `finishedAt` if it isn't already set.

**Why idempotent:** The `setOnInsert` semantics: only stamp on the first finish. If `finishedAt` is already non-null on a re-submit, do not overwrite. This is consistent with our Ragu-ragu flag design (server treats absent keys as no-op, never clears).

**Alternatives considered:**
- Have the client send a `finished: true` flag in the body — rejected, couples client + server, breaks the existing PUT contract for any new client.
- Use a separate `POST /api/tryout-attempts/[attemptId]/finish` endpoint — rejected, the runner already calls PUT and adding a second mutation is needless surface.

### Decision 3: Update `TryoutReviewMode` to enter review mode on `finishedAt !== null`, not `totalScore > 0`

**Why:** The new semantic is the source of truth. Today `app/(user)/tryout/[attemptId]/page.tsx` does `const isCompleted = attempt.totalScore > 0`. After this change, it becomes `const isCompleted = !!attempt.finishedAt`. This affects a single line.

**Why safe:** Any attempt that was previously classified as completed (`totalScore > 0`) is, by definition, a finished attempt — its PUT path set the score. Existing finished-zero-score attempts (where `totalScore === 0` but the user did press "Selesai") were previously misclassified as in-progress; they will start showing the review screen, which is the correct behavior. There's a small UX risk for any user who happened to be in a zero-score finished attempt and relied on the runner appearing again — acceptable trade-off.

### Decision 4: List filtering happens on the client

**Why:** The data is small per user (a handful of attempts) and the filters are dynamic: "is the package still active" depends on `isPackageAvailable(pkg)` which uses the current date. A server filter would need to be re-evaluated on the client anyway. Compute the list in `app/(user)/tryout/page.tsx` from already-fetched `attemptHistory`, `tryoutBanks`, and `packages`.

**Wire shape:** The list endpoint stays as-is; the client filters. No new API.

**Alternatives considered:**
- Add a server-side `GET /api/tryout-attempts/finished?userId=...` with the filter baked in — rejected, premature optimization, harder to test, duplicates data fetching.

### Decision 5: Full-width single-column cards

**Why:** The user explicitly requested one card per attempt taking the full width. Single-column layout (one card per row) is the simplest implementation and reads well for a chronological list. Cards are styled to match the existing "Paket Tryout Kamu" cards (gradient + shadow) but with a different accent color (purple/teal) to distinguish the "completed" status.

**Width:** Same max-width as the existing page container (the `mx-auto w-full` wrapper). On mobile, cards stack with full bleed.

### Decision 6: `FinishedAttemptCard` is its own component

**Why:** Same argument as every other card in this codebase: testable, composable, can be reused in `/ranking` or future pages.

**Props:** `{ attemptId, tryoutName, packageName, finishedAt, totalScore, twkScore, tiuScore, tkpScore, onView }`.

## Risks / Trade-offs

- [Risk: Server-driven `finishedAt` stamp on PUT could be triggered by mistake if the runner auto-saves mid-attempt] → **Mitigation:** Today, the only PUT caller is `useUpdateAttempt`, which the runner fires from `onFinish` (timer expiry or "Selesai" click). No auto-save exists. If a future change adds auto-save, the server can distinguish score-writing vs flag-only by inspecting the request body.
- [Risk: `TryoutReviewMode` now shows for previously-broken zero-score finished attempts] → **Mitigation:** These users were misclassified before. The new behavior is correct.
- [Risk: List grows unbounded] → **Mitigation:** Out of scope for v1. A "show more" pagination is a future enhancement. Most users will have < 50 finished attempts.
- [Risk: Migration adds nullable column with no default, and old finished attempts have `finishedAt = null`] → **Mitigation:** Acceptable. The list shows attempts finished *after* the migration. Old rows are still reachable via the existing `/tryout/[attemptId]` URL if needed. We do not backfill because we cannot reliably distinguish "really finished with 0 score" from "abandoned mid-attempt with 0 score" without additional data.
- [Trade-off: `useAttemptHistory` already exists and returns a flat array; we extend its return shape with one more field (`finishedAt`)] → **Mitigation:** The shape is already an internal type — adding a field is non-breaking for any caller that uses `??` defaults.

## Migration Plan

1. Add `finishedAt DateTime?` to `TryoutAttempt` in `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name add_attempt_finished_at`. The migration is a single nullable column add — instant on Postgres for our table sizes.
3. Deploy: the new field is additive and nullable. Old API consumers ignore it; new client uses it.
4. Rollback: drop the column. No data loss — the column starts empty.
5. Feature rollout: ship the UI behind the same code path; absence of `finishedAt` on existing rows simply means they don't appear in the new list (acceptable).

## Open Questions

- Should we show the "best score" or the "latest attempt's score" on the card? → **Resolved in this design:** show the **attempt's own score** (the one represented by that card), with a sub-line indicating the tryout's best across attempts if it differs. Simpler, more honest.
- Should the section be hidden when the user has zero finished attempts, or always rendered with an empty state? → **Resolved:** always render with a friendly empty state when empty, so the user knows the feature exists.
