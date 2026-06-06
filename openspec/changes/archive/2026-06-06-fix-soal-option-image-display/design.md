## Context

The admin question bank list (`components/admin/SoalTable.tsx`) is used in `/admin/soal` to preview every question and its answer options for a selected tryout, before an admin edits or deletes it. The component has two render paths: a mobile list (`md:hidden`) and a desktop table. Both paths compute the visible options by filtering on `optionText` only, and neither renders `optionImage`.

Meanwhile, the question editor (`app/admin/soal/page.tsx` → `saveSoal`) treats an option as filled when **text OR image** is present, and the API (`/api/tryouts/[tryoutId]/questions`) round-trips `optionImage` correctly. The result: an admin can save an image-only option, but it is invisible in the list — making the list an unreliable preview of what was saved.

The user-facing side (`components/tryout/TryoutEngine.tsx`) already renders option images correctly, so the bug is confined to the admin preview surface.

## Goals / Non-Goals

**Goals:**
- Make the admin question list show every option that the editor accepts to save.
- Render `opt.optionImage` as a small thumbnail next to (or instead of) `opt.optionText` in both mobile and desktop render paths.
- Lock the behavior down with tests in `SoalTable.test.tsx`.

**Non-Goals:**
- No DB or API changes (data layer is already correct).
- No changes to the question editor form or to the user-facing tryout renderer.
- No changes to the question image (`questionImage`) or explanation image (`explanationImage`) rendering — those already work.
- No redesign of the question list layout; this is a targeted rendering fix.

## Decisions

### Decision 1: Image-only options are visible, not hidden

**Choice:** An option counts as "filled" if `optionText?.trim() || optionImage`.

**Why:** Mirrors the editor's acceptance rule (`saveSoal` line 253-255), eliminating the editor/list mismatch. If we let the editor save image-only options but the list hides them, the admin cannot tell what they have.

**Alternatives considered:**
- *Tighten the editor to require text* — simpler list code, but a UX regression (some answer options are image-only by design, e.g. pattern recognition questions).
- *Keep list showing text-only, drop image-only silently* — preserves the existing bug; rejected.

### Decision 2: Render image as a small thumbnail alongside text

**Choice:** A fixed-size thumbnail (matches the existing `questionImage` thumbnail style: `w-12 h-12` on desktop, `w-16 h-16` on mobile) renders after the option text (or in place of it for image-only options).

**Why:** Consistent with how `questionImage` is already displayed in the same component (line 63-72 mobile, 160-170 desktop). Reusing the pattern keeps visual language coherent and avoids introducing a new layout.

**Alternatives considered:**
- *Open image in a modal on click* — useful for detail-heavy review, but out of scope and would inflate the change.
- *Skip image in the list, show only in the edit modal* — leaves the list blind, which is the original problem.

### Decision 3: Fix both render paths in the same change

**Choice:** Mobile and desktop paths are updated in the same PR, with mirrored behavior and tests covering both.

**Why:** The two paths are textually duplicated (and both currently wrong). Fixing one and leaving the other creates a device-dependent bug — worse than today's uniform bug.

**Alternatives considered:**
- *Refactor to a single shared `<OptionRow>` component* — cleaner long-term, but expands scope from "fix a bug" to "refactor + fix". Defer to a follow-up.

### Decision 4: Test scenarios are minimal and behavioral

**Choice:** Add three scenarios to `SoalTable.test.tsx`:
1. Image-only option is visible (text empty, image present).
2. Text+image option shows both.
3. Existing text-only behavior unchanged (regression guard).

**Why:** These cover the new requirement + the regression. Aiming for "one assertion per scenario", not exhaustive. Visual snapshot tests are out of scope.

## Risks / Trade-offs

- **Risk:** Mismatch between mobile and desktop thumbnail sizes could be jarring.  
  **Mitigation:** Use the existing `questionImage` thumbnail dimensions from each view as the source of truth (12×12 desktop, 16×16 mobile), so all images in the list are the same size.

- **Risk:** Without refactoring, the duplicated `filledOpts` filter and option-render logic in both paths can drift again.  
  **Mitigation:** Add a code comment on each callout pointing to the twin. The refactor itself is tracked as a follow-up.

- **Risk:** Long option text without an image but with whitespace could still be filtered out — currently treated as filled (`o.optionText.trim().length > 0`). Unchanged by this fix; pre-existing behavior.

## Migration Plan

No data migration. Deploy is a code-only change:

1. Update `components/admin/SoalTable.tsx` (both render paths).
2. Update `components/admin/SoalTable.test.tsx` with new scenarios.
3. Run `npm run test` and `npm run lint` — both must pass.
4. Rollback: revert the single commit. No DB or cache to clear.

## Open Questions

_None — all decisions resolved during exploration. The bug surface is small and the fix is mechanical._
