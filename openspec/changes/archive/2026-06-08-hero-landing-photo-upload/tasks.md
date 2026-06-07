## 1. LogoEditor — Wire ImageUpload to heroImg

- [x] 1.1 Import `ImageUpload` at top of `components/admin/LogoEditor.tsx` (already imported, verify)
- [x] 1.2 Replace plain `<input>` for Hero Image URL with `<ImageUpload value={draft.heroImg || ''} onChange={(v) => update('heroImg', v)} label="Foto Hero" />`
- [x] 1.3 Remove the redundant inline `<Image>` preview block (`{draft.heroImg && (<div className="rounded-lg overflow-hidden...>...</div>)}`) since ImageUpload handles preview

## 2. Admin Landing Hero Modal — Wire ImageUpload to heroImg

- [x] 2.1 Import `ImageUpload` in `app/admin/landing/page.tsx` (not currently imported)
- [x] 2.2 Replace `{field('URL Foto Hero', draft.heroImg || '', ...)}` with `<ImageUpload value={draft.heroImg || ''} onChange={(v) => updateField('heroImg', v)} label="Foto Hero" />`

## 3. Fix: Persist logo-config changes to DB (pre-existing bug)

- [x] 3.1 Add optional `onSave` callback prop to `LogoEditor` — called after `setLogoConfig()`
- [x] 3.2 Extract `syncLogoConfig` from store in admin/landing, pass as `onSave` to LogoEditor
- [x] 3.3 Call `syncLogoConfig()` in `saveSection()` after `setLogoConfig()` so hero modal also persists
- [x] 3.4 Verify build passes — zero errors

## 4. Verify

- [x] 4.1 Start dev server, navigate to `/admin/landing`, test file upload + save in LogoEditor, confirm DB persisted
- [x] 4.2 Open hero section modal (click "Edit" on Hero Section), test file upload + URL paste + save, confirm DB persisted
- [x] 4.3 Verify uploaded image renders on public landing page `/`
