## Why

TWK and TIU questions currently award a hardcoded 5 points per correct answer (`lib/scoring.ts:9`). We want every TWK and TIU question to be worth exactly 1 point, applied as a single global rule across all tryouts. This simplifies the score vocabulary (per-question equals per-point), brings our internal math in line with how CAT-BKN communicates passing thresholds (which are expressed in "number of correct answers" rather than total points), and removes a magic number that has no product justification.

## What Changes

- `lib/scoring.ts` — `getScore()` returns 1 point (not 5) for a correct TWK or TIU answer. TKP scoring path is unchanged.
- `components/tryout/TryoutEngine.tsx` — the result-phase pass thresholds update to **TWK: 13** and **TIU: 16** (the existing 65 and 80 divided by 5). The total passing threshold becomes 195 (was 298). The per-category card label changes from `Ambang: 65` to `Ambang: 13 soal` so the small number reads clearly to users.
- `lib/scoring.test.ts` — five existing assertions that expect `5` and the accumulated total `15` are updated to `1` and `11`.
- `TRYOUTS.md` — documentation line that records "TWK & TIU: correct = 5 points" is updated to "correct = 1 point".

No database migration. No schema change. No admin UI change. The rule is global; there is no per-tryout or per-category configuration surface in this change.

## Capabilities

### New Capabilities

- `tryout-scoring`: Codifies the scoring rules for TWK, TIU, and TKP — point values per correct answer, pass thresholds per category, and the user-facing display format for thresholds. This change introduces the capability with a minimal initial spec covering the TWK/TIU single-point rule and threshold math.

### Modified Capabilities

None. No existing spec's REQUIREMENTS are changing — the existing tryout specs reference scores in examples only, not as normative behavior. The scoring behavior was previously implementation-only (hardcoded in `lib/scoring.ts`) with no spec coverage.

## Impact

- **Code**: `lib/scoring.ts`, `lib/scoring.test.ts`, `components/tryout/TryoutEngine.tsx`, `TRYOUTS.md`.
- **Stored data**: `TryoutAttempt.twkScore`, `tiuScore`, `totalScore` rows are snapshots taken at attempt finish time. Historical attempts keep their old 5-pt scoring. New attempts use 1-pt scoring. No backfill.
- **APIs**: No request/response shape change. The `useUpdateAttempt` PUT body still carries `twkScore`/`tiuScore`/`tkpScore`/`totalScore`; only the values stored in those fields change at submit time.
- **UI**: Result-phase card text and per-category pass/fail logic update. No new admin surface. No new user input.
- **Out of scope**: TKP scoring (per-option `tkpValue`, unchanged), TKP pass threshold 166 (unchanged), per-tryout scoring configuration, negative scoring, partial credit.
