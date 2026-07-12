## Why

The `twk-tiu-single-point` change hardcodes the per-question point value (1) and the pass thresholds (TWK 13, TIU 16, TKP 166) into the codebase. Today no surface exists for an admin to adjust these values. This change is a follow-up: introduce a configuration surface so admin can tune scoring rules without a code change.

The motivation for follow-up (not bundling with `twk-tiu-single-point`):

- `twk-tiu-single-point` is a one-way simplification with no schema impact. Keeping it minimal lets it ship and be verified in isolation.
- Configurability adds a new storage shape, a new admin UI, and a new API. Different scope, different risk profile, easier to review and revert independently.

## What Changes

To be determined. The exact shape of this change depends on three open decisions listed in **Open Questions** below. Once those are locked, the change will modify:

- A new storage location (likely a new Prisma model, a new column on `Tryout`, or a `LogoConfigEntry`-style key-value row) for the configurable values.
- A new admin-only API endpoint(s) to read and update the configuration.
- A new admin UI surface — either a new tab in `app/admin/settings` or a new section in the existing tryout management modal — for editing the configuration.
- `lib/scoring.ts` and/or `components/tryout/TryoutEngine.tsx` to read the configured value instead of the hardcoded literal.
- A new capability spec `tryout-scoring-config` (or an extension to the existing `tryout-scoring` spec) describing the configuration surface.

The **functional** change is: per-question point value and pass thresholds move from code constants to admin-editable configuration. The **math** of scoring and pass/fail logic stays the same.

## Capabilities

### New Capabilities

- `tryout-scoring-config`: Codifies the admin-facing configuration surface for tryout scoring — which values are configurable, how they are stored, and how they are exposed to the admin.

### Modified Capabilities

- `tryout-scoring`: When `twk-tiu-single-point` is archived, the canonical spec will describe the *current* hardcoded behavior. This follow-up change extends that spec to say the values are now configurable. The exact delta (modified vs. replaced requirements) depends on the storage shape chosen below.

## Impact

- **Code**: `lib/scoring.ts` (signature change to accept config), `components/tryout/TryoutEngine.tsx` (read config instead of literals), `app/admin/settings` (new UI section or tab), a new API route, a new Prisma model or migration.
- **Schema**: One new model, or new columns on `Tryout`, depending on the shape decision.
- **Stored data**: Historical `TryoutAttempt.twkScore`/`tiuScore`/`tkpScore`/`totalScore` rows are snapshots at finish time. New attempts use the configured value at submit time. **No backfill** — same snapshot semantics as `twk-tiu-single-point`.
- **APIs**: A new admin-only endpoint, e.g. `GET/PUT /api/admin/scoring-config` or per-tryout endpoints on `/api/admin/tryouts/[id]`.
- **UI**: New admin surface; no user-facing change other than the configured values taking effect on new attempts.

## Dependencies

This change **depends on** `twk-tiu-single-point` being archived first. The follow-up configures the values that the initial change locks in. Shipping order:

1. Land `twk-tiu-single-point` — values become 1 / 13 / 16 / 166 hardcoded.
2. Land `tryout-scoring-config` — values become admin-editable, defaulting to 1 / 13 / 16 / 166.

## Open Questions

Three decisions must be locked before design.md and tasks.md can be written.

### Q1. Storage shape

How are the configurable values stored? Three options:

- **A. New `TryoutScoringConfig` Prisma model (singleton row)** — global config, applies to all tryouts. One row, fixed id (e.g., `id = 1`). Migration creates the table.
- **B. New columns on `Tryout`** — per-tryout config. `twkPointsPerCorrect`, `tiuPointsPerCorrect`, `tkpPointsPerCorrect`, `twkPassThreshold`, `tiuPassThreshold`, `tkpPassThreshold`. Migration adds the columns with defaults matching current hardcoded values.
- **C. Reuse `LogoConfigEntry` key-value pattern** — global config, no new migration, JSON-encoded value. Same pattern as brand color / hero image config. Less typed; admin UI needs a small parser.

**Tradeoffs:**

- A is the cleanest typed model but requires a new table and admin API surface.
- B is the most flexible (different tryouts can have different rules) but the largest schema change and requires per-tryout UI.
- C is the smallest change and follows an existing pattern, but trades type safety for compactness.

### Q2. Per-tryout vs global

If Q1 = A or C, the config is global (one value, all tryouts). If Q1 = B, per-tryout is the natural shape. The question: **do you want different tryouts to potentially have different rules?** Today no. But:

- A "trial" tryout might want a lower pass bar.
- A future "advanced" tryout might want a higher per-question value.

If the answer is "no, all tryouts use the same rules," prefer Q1 = A or C. If "yes, we want per-tryout control," prefer Q1 = B.

### Q3. Which values are configurable?

The full set of currently-hardcoded values is:

- Per-question point value: TWK, TIU, TKP (TKP is per-option, slightly different shape).
- Pass thresholds: TWK, TIU, TKP.
- Total passing threshold: derived (13 + 16 + 166 = 195) or independent?

Two options:

- **All values configurable**: maximum flexibility, biggest UI surface.
- **Only thresholds configurable**: keeps the scoring math fixed (1 pt/correct for TWK/TIU, per-option for TKP) but lets admin adjust the pass bar. Smaller change, addresses the most common admin ask.

## Out of Scope

- Negative scoring, partial credit, per-section bonus — same as `twk-tiu-single-point`.
- Recomputing historical `TryoutAttempt` scores under new config.
- A/B testing different cutoff scores per user cohort.
- Per-question TKP value overrides (each option's `tkpValue` is already admin-editable in the question form).
