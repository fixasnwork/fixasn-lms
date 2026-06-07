## Why

Admin currently cannot upload hero landing page photo directly — only paste external URLs. The `ImageUpload` component (which wraps both URL paste + Supabase file upload) already exists and is wired to the custom logo image field, but was never extended to the hero image field. This forces admins to manually upload to Supabase dashboard then copy-paste URLs. Fixing it requires replacing two plain `<input>` elements with the existing `<ImageUpload>` component. No new infrastructure needed.

## What Changes

- Replace plain URL `<input>` for hero image in `components/admin/LogoEditor.tsx` with `<ImageUpload />` component (consistent with custom logo field)
- Replace plain URL `<input>` for hero image in `app/admin/landing/page.tsx` hero section modal with `<ImageUpload />` component
- Remove redundant inline `<Image>` preview in LogoEditor (ImageUpload provides its own preview)
- Data flow unchanged: file upload → `/api/upload` → Supabase → public URL → `logoConfig.heroImg` → Zustand → `syncLogoConfig()` → DB

## Capabilities

### New Capabilities

- `admin-hero-image-upload`: Allow admin to upload hero landing page image via file picker (Supabase storage) or URL paste, using the existing ImageUpload component

### Modified Capabilities

_None._ All existing APIs (`/api/upload`, `/api/logo-config`), data model (`LogoConfigEntry`), and state management (`useAppStore.logoConfig`) remain unchanged.

## Impact

- `components/admin/LogoEditor.tsx` — swap heroImg `<input>` for `<ImageUpload />`, remove inline preview
- `app/admin/landing/page.tsx` — swap heroImg `<input>` for `<ImageUpload />` in hero section modal
- No API changes, no DB schema changes, no new dependencies
- No breaking changes — same data flow, same storage, same persistence
