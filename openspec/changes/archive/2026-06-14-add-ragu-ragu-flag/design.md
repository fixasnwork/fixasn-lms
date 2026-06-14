## Context

The tryout attempt runner (`app/(user)/tryout/[attemptId]/page.tsx` + `components/tryout/TryoutEngine.tsx`) currently lets users select an answer option per question and submit when the timer expires. There is no way to mark questions where the user feels uncertain — a common need during exam prep. We are adding a **Ragu-ragu** (Indonesian for "unsure/doubtful") flag that is:

- Per-question, per-attempt (independent of answer choice).
- Persisted to the `AttemptAnswer` table so it survives reload and is available in the result review.
- Visualized during the attempt (yellow mark on the question card + yellow dot in the nav palette) and after submission (indicator + summary stat).

Existing flow recap:
- `AttemptAnswer` row is created/upserted on `PUT /api/tryout-attempts/[attemptId]` with `questionIndex` + `selectedOption`.
- `useUpdateAttempt` hook in `hooks/useTryoutQueries.ts` calls that endpoint with `answers: Record<number, number>`.
- `TryoutEngine` renders the question card and nav palette client-side.
- `TryoutReviewMode` shows results after submit.

Stakeholders: end users (better self-review); product (future analytics on confidence calibration).

## Goals / Non-Goals

**Goals:**
- Add `raguRagu` boolean to `AttemptAnswer` and persist it through the existing answer upsert endpoint.
- Surface a toggle in the question card (next to / below the answer options).
- Visually mark flagged questions: yellow border + flag icon on the question card, yellow dot on the nav palette number.
- Show flag indicator + count in post-submit review (`TryoutReviewMode`) and result summary.
- Maintain existing behavior for answer submission, scoring, and result computation.

**Non-Goals:**
- No real-time sync between devices/sessions.
- No per-flag comments, tags, or reasons (keep it a single boolean).
- No analytics dashboard for flag distribution (out of scope; data is captured for later).
- No changes to scoring logic — flag is purely a user-side marker.

## Decisions

### Decision 1: Store flag on `AttemptAnswer`, not a separate table

**Why:** A 1:1 mapping already exists between attempt and question (one `AttemptAnswer` row per `questionIndex`). Adding a boolean column is the smallest change; no new joins, no new unique constraints.

**Alternatives considered:**
- Separate `AttemptAnswerFlag` table — rejected: extra join for every read, more code for no benefit at single-bit-per-row scale.
- JSON column on `TryoutAttempt` — rejected: harder to query, breaks the existing "one row per question" shape.

### Decision 2: Persist flag via the existing `PUT /api/tryout-attempts/[attemptId]` endpoint

**Why:** The endpoint already upserts `AttemptAnswer` rows. Extending it to also write `raguRagu` avoids a second round-trip and keeps the client's mutation surface small.

**Wire format:** Change the request body to accept an `answers` payload that allows per-question `{ selectedOption, raguRagu }` objects, OR add a sibling `raguRaguFlags: Record<number, boolean>` map. We choose the **sibling map** approach — it keeps the existing `answers: Record<number, number>` shape unchanged and lets the client send flag-only updates without re-sending answer choices.

**Alternatives considered:**
- New `PATCH /api/tryout-attempts/[attemptId]/flag` endpoint — rejected: extra endpoint, extra client mutation, splits the write path.
- Embed flag in `answers` as objects — rejected: breaks the simple `Record<number, number>` typing and requires more refactor in the runner.

### Decision 3: Add a dedicated `useUpdateAttemptFlags` mutation (or extend `useUpdateAttempt`)

**Why:** Flag toggles are more frequent than full answer saves. A dedicated mutation that hits the same endpoint with a flag-only payload is clean and can be debounced/invalidated independently.

**Implementation:** Add a thin `useUpdateAttemptFlags(attemptId)` hook that calls `PUT /api/tryout-attempts/[attemptId]` with only `raguRaguFlags` in the body. Server treats it as additive (no-op for absent keys; create/update existing `AttemptAnswer` rows without touching `selectedOption`).

### Decision 4: Client-side state in `TryoutEngine`, hydrated from server

**Why:** The engine already maintains `currentIndex` and a derived answer map. Add a `Set<number>` of flagged `questionIndex` values, hydrated from `attempt.answers` (or a sibling `raguRagu` record returned by the GET endpoint).

**Toggle UX:**
- A button labeled **"Tandai Ragu-ragu"** (when unflagged) / **"Batalkan Ragu-ragu"** (when flagged) appears below the answer options, with a flag icon.
- Click triggers the mutation, updates the local set, and renders the yellow mark.
- The flag persists across navigation within the attempt; the engine refetches on mount and reconciles.

### Decision 5: Yellow visual language

- **Question card border:** when flagged, the card gets a `border-2 border-yellow-400` (Tailwind) wrapper and a soft yellow background tint (`bg-yellow-50/30`) and a flag icon top-right.
- **Nav palette dot:** a small `bg-yellow-400` dot at the top-right corner of the flagged question number tile.
- **Result review:** a small yellow "Ragu-ragu" pill next to the question number.
- **Result summary:** "X dari Y soal ditandai Ragu-ragu" stat card alongside existing TWK/TIU/TKP scores.

### Decision 6: Schema migration is additive, no backfill needed

`raguRagu` defaults to `false`. Existing rows get the default on next read; no data migration script required. Prisma migration is a single `ALTER TABLE`.

## Risks / Trade-offs

- [Risk: Server endpoint signature change] → **Mitigation:** keep `answers` and `raguRaguFlags` as independent optional fields. Old clients (no flag writes) keep working unchanged. New clients can opt in.
- [Risk: Frequent flag toggles → network spam] → **Mitigation:** debounce the mutation (200-300ms) at the hook layer; latest-write-wins is acceptable for a boolean.
- [Risk: Out-of-sync between local `Set` and server state after multiple tabs] → **Mitigation:** rely on TanStack Query invalidation; on remount, engine hydrates from server response. (Cross-tab sync is a known limitation — acceptable for v1.)
- [Risk: Migration downtime] → **Mitigation:** single non-null column add with default; Postgres applies instantly for the table sizes in use (<10k rows expected).
- [Trade-off: Flag data has no UI affordance to *un*-flag in review] → Mitigation: in review mode, the indicator is read-only. User can un-flag during a fresh attempt only (acceptable; matches user mental model).

## Migration Plan

1. Add `raguRagu Boolean @default(false)` to `AttemptAnswer` in `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name add_attempt_answer_ragu_ragu`.
3. Deploy: schema change is backward-compatible (default `false`, no required field changes).
4. Rollback: drop the column (no data loss; flag was zero-state on rollback).
5. Feature-flag rollout: ship the UI behind the same code path; no separate kill switch needed because absence of writes is a no-op on the server.

## Open Questions

- Should un-flagging be allowed after a question is *answered* (currently yes — flag is independent of answer)? **Resolved during this design:** yes, independent.
- Should we surface a "review flagged questions only" filter on the result page? **Out of scope for v1** — see `### Decision 5` and `## Goals / Non-Goals`.
- Should the flag be visible to admins? **Out of scope** — no admin view in this change.
