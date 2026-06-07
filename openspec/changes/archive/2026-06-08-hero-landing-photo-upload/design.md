## Context

Admin already edits hero landing page content via two locations:

1. `components/admin/LogoEditor.tsx` — branding editor with color pickers, custom logo upload, and hero image URL input
2. `app/admin/landing/page.tsx` — hero section modal with fields for titles, description, captions, stats, and hero image URL

Both locations use plain `<input type="text">` for `heroImg` — URL paste only. The `ImageUpload` component already wraps URL paste + Supabase file upload + preview and is wired to the `customImg` field in LogoEditor. Extending it to `heroImg` is a drop-in replacement in two files.

Current state: `ImageUpload` component (105 lines) accepts `value: string` and `onChange: (url: string) => void`. Substitute an `<input>` with `<ImageUpload value={...} onChange={...} />`.

## Goals / Non-Goals

**Goals:**
- Admin can upload hero image from local file system via Supabase (same as custom logo)
- Admin can paste hero image URL directly (same as custom logo)
- Both editing locations (LogoEditor + admin/landing modal) support upload
- No regressions in existing image preview, error handling, or persistence

**Non-Goals:**
- No drag-and-drop or multi-image support
- No hero image cropping/resizing
- No changes to Supabase bucket, upload API, or storage quotas
- No changes to `LogoConfig` type, Prisma schema, or logo-config API

## Decisions

### Decision 1: Reuse ImageUpload component as-is

**Chosen:** Drop-in `<ImageUpload />` replacement for `<input>` elements in both files.

**Alternatives considered:**
- New `HeroImageUpload` component: Unnecessary abstraction. Same props, same behavior. Creates maintenance burden.
- Enhance ImageUpload to accept `label` differently: Already supports optional `label` prop. No changes needed.

**Rationale:** ImageUpload already handles URL paste, file selection, upload progress, error display, and preview with clear button. Zero new code for upload behavior.

### Decision 2: Remove redundant inline preview in LogoEditor

**Chosen:** Delete the `<Image>` preview block below the heroImg input in LogoEditor.

**Rationale:** ImageUpload renders its own preview with a clear button. Having both causes UI duplication and potential inconsistency (ImageUpload shows `object-contain` on gray bg; old preview uses `object-cover`). Single preview source of truth.

### Decision 3: No new tests needed

**Rationale:** This is a component composition change — replacing one controlled input with another controlled component that exposes the same `value`/`onChange` contract. ImageUpload already has coverage through the custom logo path. End-to-end behavior (file upload → URL → persist → render on landing page) is unchanged at the API/store level.

## Risks / Trade-offs

- **Risk:** ImageUpload has `unoptimized` prop on next/Image (line 57). This means uploaded hero images won't go through Next.js optimization pipeline, potentially loading large files on landing page.
  - **Mitigation:** Existing behavior — same for custom logo. Not introduced by this change. Landing page `HeroImage` already uses next/Image with `sizes` and `onError` fallback. File size concerns are pre-existing and out of scope.
