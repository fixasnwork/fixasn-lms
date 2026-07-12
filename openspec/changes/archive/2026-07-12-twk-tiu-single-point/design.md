## Context

`lib/scoring.ts` is the single source of truth for tryout scoring. The function `getScore(q, answerIdx)` returns the per-question score; `calculateScoring(questions, answers)` aggregates it. Today the function returns 5 for any correct TWK/TIU answer via a hardcoded literal, with no DB-backed configuration, no per-tryout override, and no environment variable. The pass thresholds (TWK: 65, TIU: 80, TKP: 166) are hardcoded as object literals in the result-phase card of `TryoutEngine.tsx:487-489`, and the same numbers appear in the header copy at `TryoutEngine.tsx:483`.

The product decision is to make every TWK and TIU question worth exactly 1 point as a single global rule. This aligns our internal math with the "13 correct out of 30" / "16 correct out of 35" language CAT-BKN uses to communicate passing, and removes a magic number that has no product justification.

## Goals / Non-Goals

**Goals:**

- TWK and TIU questions award 1 point for a correct answer, 0 for an incorrect or unanswered answer, for every tryout.
- Pass thresholds become 13 (TWK) and 16 (TIU) — the existing 65/80 values divided by 5.
- The result-phase display shows the threshold as `Ambang: 13 soal` (and `Ambang: 16 soal`) so the small number is unambiguous.
- The total passing threshold becomes 195 (13 + 16 + 166).
- TKP scoring continues to use per-option `tkpValue` and the 166 threshold is unchanged.
- Existing tests, documentation, and header copy stay internally consistent after the change.

**Non-Goals:**

- Per-tryout or per-category point configuration. This change does not introduce a configuration surface; the rule is global and lives in code.
- A database migration or new Prisma column. Scoring values are not persisted per question; the attempt score is a single snapshot at finish time.
- Changes to TKP scoring math or threshold. TKP is orthogonal — per-option weighted values, not per-question fixed.
- Negative scoring, partial credit, or per-section bonus scoring. None of those are in scope.
- Backfilling historical `TryoutAttempt.twkScore`/`tiuScore`/`totalScore` rows. Snapshot semantics mean old attempts keep their old values.

## Decisions

### Decision 1: 1 point per correct TWK/TIU answer, hardcoded (no config)

We change the `5` literal in `lib/scoring.ts:9` to `1` and stop there. We do not introduce a `TWK_POINTS_PER_CORRECT` constant, environment variable, or database field. The rule is global; making it configurable would add an API surface, admin UI, and tests for a value no one plans to vary.

**Alternatives considered:**

- *Per-tryout config via `Tryout.pointsPerQuestion`*: rejected. The product need is "1 point for everything". Adding per-tryout config now means every future tryout creator has to make a decision about a value that has a single correct answer.
- *Per-category config (TWK=1, TIU=2)*: rejected. The user's stated rule is "1 point for both". No asymmetry is required.
- *Environment variable*: rejected. The value is not environment-dependent and should not be tunable per deploy.

### Decision 2: Pass thresholds convert via the existing 5-pt math (13 and 16)

The existing 65 and 80 thresholds came from the real CAT-BKN convention: 13 correct × 5 pts = 65, 16 correct × 5 pts = 80. The 13 and 16 are the *underlying* threshold; 65 and 80 are *score-derivative*. Dropping per-question to 1 point means the underlying threshold (13 and 16 correct) becomes the surface value.

**Alternatives considered:**

- *50% rule (15 / 18)*: rejected. Cleaner to communicate but arbitrary. The 13/16 math is the real CAT-BKN convention and matches what the existing code was approximating.
- *Keep 65/80 thresholds as-is*: rejected. With 1 pt/question, 65 correct is impossible out of 30 questions. Would make every user fail TWK.

### Decision 3: Per-card label uses "Ambang: N soal" format

`TryoutEngine.tsx:497` currently renders `Ambang: 65`. With 13, a bare number reads as "very low bar" and confuses users. Adding the unit `soal` makes it clear the threshold is in number of correct answers. The result card text becomes `Ambang: 13 soal` and `Ambang: 16 soal`.

**Alternatives considered:**

- *Bare number* (`Ambang: 13`): rejected. The small number invites confusion.
- *Out-of-total format* (`Ambang: 13/30 soal`): rejected. Adds visual noise and the question count is already shown in the per-section progress (`TWK: 12/30`).

### Decision 4: Header copy is updated in the same change

`TryoutEngine.tsx:483` has a hardcoded string `Nilai Ambang Batas SKD: 298 (TWK≥65, TIU≥80, TKP≥166)`. This must update to `Nilai Ambang Batas SKD: 195 (TWK≥13, TIU≥16, TKP≥166)` in the same change, otherwise the header contradicts the per-card label.

### Decision 5: TKP threshold stays at 166 (orthogonal change)

The TKP threshold is not affected by this change. TKP scores are sums of per-option `tkpValue` (typically 1–5 per option, can be 0). The 166 threshold is a CAT-BKN convention for "sum of TKP scores across 45 TKP questions where each option sums to 5". Changing per-question TKP values would change the achievable max but is out of scope for this change.

### Decision 6: No backfill of historical `TryoutAttempt` rows

`TryoutAttempt.twkScore`, `tiuScore`, and `totalScore` are computed once at attempt submit time (`app/(user)/tryout/[attemptId]/page.tsx:107` calls `calculateScoring` and PUTs the totals). The values are never recomputed. We do not migrate existing rows. Old attempts keep their old 5-pt scoring visible in `FinishedAttemptCard` and the global ranking — this is acceptable because:

- The score is what the user earned under the rules in effect at the time.
- The "kenaikan nilai" boundary is the attempt finish timestamp, not a future code change.
- Migration would require re-running scoring against historical question data, which is a separate concern.

## Risks / Trade-offs

- [Historical score inconsistency] → In the running system, finished attempts under the old 5-pt rule will display different TWK/TIU numbers than new attempts under the 1-pt rule. → **Mitigation:** Acceptable per snapshot semantics. No user-facing communication needed; the change is a one-way simplification. If consistency becomes a concern later, the snapshot is a one-time re-derivation per attempt.
- [Ranking history shifts] → Global and per-tryout ranking use stored `totalScore`. Old attempts will rank by old (5-pt) scores; new attempts by new (1-pt) scores. → **Mitigation:** Same as above. Existing ranking data is read-only history.
- [Single source of truth is the literal in `lib/scoring.ts`] → A future regression that re-introduces 5 would silently break the rule. → **Mitigation:** The test in `lib/scoring.test.ts` asserts `1` for TWK/TIU correct answers and the `total: 11` accumulator. A literal regression trips the test.
- [Per-tryout config not available] → If the product later wants different weights per tryout, this change does not provide a config surface. → **Mitigation:** Out of scope for this change. A future change can add a `Tryout.pointsPerCorrect` field with a backfill. Documented in the spec as a known non-goal.

## Migration Plan

This is a code-only change with no database migration. Deploy order:

1. Land the change with updated `lib/scoring.ts`, tests, `TryoutEngine.tsx`, and `TRYOUTS.md` in a single commit.
2. Run `npm run test` and `npm run lint` and `npm run build` to verify nothing else depends on the 5-pt literal.
3. Manual smoke: start a TWK-heavy attempt, finish, verify the result card shows `TWK: N/13` and the per-card `Ambang: 13 soal` label.
4. No rollback plan beyond a standard `git revert` — the only persistent effect is new attempt scores, which are independent of the old.

## Open Questions

None. The user has confirmed both key decisions:

- Thresholds: option A (13/16, direct conversion).
- Per-card label: `Ambang: N soal` (explicit unit).
