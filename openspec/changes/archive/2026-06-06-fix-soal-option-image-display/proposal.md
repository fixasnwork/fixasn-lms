## Why

In the admin `/soal` page, when an admin uploads an image for an answer option (either with or without accompanying text), the image is not shown in the question list table — neither on mobile nor desktop view. Worse, options that contain **only an image** (no text) are hidden entirely from the list, even though the data is saved and the validation in `saveSoal` already accepts them. This blocks admins from visually verifying their question bank before publishing and creates an inconsistency between the editor (accepts image-only) and the list (hides image-only).

## What Changes

- In `components/admin/SoalTable.tsx`, both the mobile list and desktop table render paths will:
  - Treat an option as "filled" if it has **text OR image** (currently text-only)
  - Render a small thumbnail of `opt.optionImage` next to the option text (or instead of it, when text is empty)
- Behavior change: the question list will show all options that the form allows the admin to create, including image-only options. No DB or API changes required.
- New tests in `components/admin/SoalTable.test.tsx` covering image-only, text+image, and text-only options.

## Capabilities

### New Capabilities

- `admin-question-bank-display`: Specifies how the admin question bank list renders questions and their answer options, including image-aware option display and the consistency rule between the editor's accepted inputs and the list's visible rows.

### Modified Capabilities

_None — no existing spec covers the soal list's option display behavior._

## Impact

- **Code:** `components/admin/SoalTable.tsx` (both render paths), `components/admin/SoalTable.test.tsx`.
- **API:** None. Data already round-trips correctly through `/api/tryouts/[tryoutId]/questions`.
- **DB:** None.
- **UX:** Admin question list now reflects what the form accepts. Image-only options become visible.
- **Risk:** Low. Pure rendering change; no schema/API mutation. Both mobile and desktop render paths must be updated in lockstep to avoid divergent behavior.
