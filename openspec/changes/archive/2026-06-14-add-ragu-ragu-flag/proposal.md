## Why

During a tryout attempt, users often encounter questions where they feel uncertain — either the wording is ambiguous, the topic is unfamiliar, or the user simply wants to come back and review the question before submitting. Today there is no way to mark these "unsure" questions, forcing users to rely on memory or external notes. Adding a **Ragu-ragu** (Indonesian for "unsure/doubtful") flag gives users a first-class way to bookmark uncertain questions for later review, and the data gives us a foundation for future analytics (e.g., confidence calibration, post-test review).

## What Changes

- Add a `raguRagu` boolean column to `AttemptAnswer` (DB schema migration).
- Add a "Ragu-ragu" toggle button in the tryout attempt runner, near the question content.
- When flagged, the question card shows a yellow border, yellow flag icon, and a "Ragu-ragu" badge.
- The question navigation palette shows a yellow dot on flagged question numbers.
- Flag state is persisted via the existing `PATCH /api/attempts/[attemptId]/answer` endpoint (extended) so it survives reload and submission.
- The flag is per-attempt and per-question; clearing or changing an answer does not auto-clear the flag.
- Result review (post-submit) shows a small "Ragu-ragu" indicator next to each question that was flagged.
- The result summary surfaces a stat: "X dari Y soal ditandai Ragu-ragu" (X of Y questions flagged).

## Capabilities

### New Capabilities

- `tryout-ragu-ragu-flag`: User can flag/unflag individual questions within a tryout attempt as "Ragu-ragu" (unsure). Flag state is persisted per attempt-answer, visualized with yellow marks on the question card and nav palette during the attempt, and surfaced in post-submit result review and summary.

### Modified Capabilities

_None._ No existing spec requirements change. The flag is an additive capability that integrates with existing attempt/answer flows without altering their current contract.

## Impact

**Code**:
- `prisma/schema.prisma` — add `raguRagu Boolean @default(false)` to `AttemptAnswer`.
- `app/api/attempts/[attemptId]/answer/route.ts` — accept and persist `raguRagu` field.
- `app/(user)/tryout/[attemptId]/page.tsx` and its client runner components — add toggle UI, yellow mark on question card, yellow dot in nav palette.
- `app/(user)/tryout/result/...` — render "Ragu-ragu" indicator and summary stat.
- `hooks/useTryoutQueries.ts` — extend answer mutation to send/receive `raguRagu`.
- `lib/types.ts` — extend `AttemptAnswer`/`QuestionRuntime` types.
- `lib/scoring.ts` — no change (flag is cosmetic w.r.t. scoring).

**APIs**:
- `PATCH /api/attempts/[attemptId]/answer` — request body gains optional `raguRagu: boolean`.

**DB**:
- One new column on `attemptAnswers`. Migration via `npx prisma migrate dev`.
- Existing rows default to `raguRagu = false`.

**Dependencies / Systems**: None new. Uses existing Prisma + TanStack Query + NextAuth stack.

**Tests**:
- Unit: `app/api/attempts/[attemptId]/answer/route.test.ts` (or equivalent) — flag toggled on/off, persisted, loaded back.
- Component: flag toggle component — visual state, palette dot, yellow card border.
- Type tests for `AttemptAnswer` shape.
