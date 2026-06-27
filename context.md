# Scout Report: "Video Pembelajaran" Feature

## Verdict: **Scaffolded only — not implemented**

A front-facing UI shell, navigation links, permission seed, and a named package exist, but **zero backend infrastructure** (no DB model, no API routes, no admin CRUD, no upload pipeline, no storage strategy). The user-facing page at `app/(user)/video/` renders static placeholder data with a "dalam pengembangan" banner. No actual video content is stored, served, or managed anywhere.

---

## 1. UI Surface (User)

| File | Lines | Description |
|---|---|---|
| `app/(user)/video/page.tsx` | 1-170 | `VideoPage` — static client component. Renders 3 categories (TWK/TIU/TKP) with hardcoded `VideoItem[]`. Each item has title, duration, views — all fake. "Mulai" button opens Modal showing "akan segera hadir" placeholder. "PDF" download generates a `.txt` placeholder blob. Top banner: "Dalam Pengembangan". |
| `components/dashboard/DashboardHomeClient.tsx` | 63, 81-83, 131-133 | StatCard "Akses Video" shows "Belum" (gray badge). Badge "🎬 Video Coming soon" on progress section. Button "🎬 Video Belajar" pushes to `/video`. |
| `components/layouts/UserSidebar.tsx` | 21 | Nav item `{ id: "video", icon: "🎬", label: "Video Belajar" }` links to `/video`. |
| `components/layouts/MobileBottomNav.tsx` | 15 | Nav item `{ id: 'video', icon: '🎬', label: 'Video' }` links to `/video`. |
| `components/landing/LandingPage.tsx` | 114 | Feature card `{ icon: '🎬', title: 'Video + Modul Download', desc: 'Materi lengkap...' }` — marketing copy only. |
| `store/useAppStore.ts` | 110 | Testimonial text references "Video materinya sangat terstruktur" — hardcoded static content. |

**No admin UI for video.** `app/admin/` has dashboard/landing/payments/settings/soal — no video-related panel.

---

## 2. Admin Panel

**Absent.** No admin CRUD for video anywhere under `app/admin/` or `components/admin/`.

---

## 3. Database / Prisma Schema

**No video-related model exists.** Schema at `prisma/schema.prisma` (all models listed):

- `User`, `Permission`, `RolePermission`, `UserPermission`
- `Package`, `Tryout`, `PackageTryout`
- `Question`, `QuestionOption`, `TryoutQuestion`
- `BankAccount`, `Payment`, `UserPurchase`
- `TryoutAttempt`, `AttemptAnswer`
- `LogoConfigEntry`

No `Video`, `Lesson`, `Course`, `Module`, `Materi`, `VideoPembelajaran`, or any video-adjacent model. No field on `Package` that stores video count or references.

---

## 4. Backend / API Routes

**No video API routes.** `app/api/` has: auth, banks, logo-config, packages, payments, profile, questions, tryout-attempts, tryouts, upload, users — zero video endpoints.

Upload route (`app/api/upload/route.ts`) enforces:
- MIME: `image/jpeg` or `image/png` only (no video MIME)
- Size: max 5MB (too small for video)
- Extensions: `jpg`, `jpeg`, `png`
- Auth: `requireActiveSession()`

---

## 5. Business Logic / Hooks / Stores

| Asset | Path | Status |
|---|---|---|
| Hooks | `hooks/` | No video hooks exist. |
| Lib | `lib/` | No video helpers. |
| Store | `store/useAppStore.ts` | Only testimonial text string references video. |
| Data | `data/packages.ts` | `Paket Video Belajar` package defined (price: 250k). |
| Data | `data/questions.ts` | `"Paket Video Belajar": []` — empty tryout array, comment says "video content, no tryout slots". |

`useTryoutQueries.ts` has no video queries.

---

## 6. Storage / Uploads

**No video storage strategy.** Current upload system is Supabase Storage → `uploads` bucket, image-only. No signed URL logic, no video streaming, no YouTube URL field pattern anywhere.

If videos were to be added, decisions needed:
- YouTube embed URLs stored as string field on a new model?
- Supabase Storage with video MIME types allowed?
- External VOD provider?
- Field on Package or separate purchase model?

---

## 7. Side Effects (Docs & Backlog)

| Doc | Reference |
|---|---|
| `AUDIT.md` (line 155) | **"Package p4 (Video Belajar) missing"** — exists in `DEFAULT_PACKAGES` but has no entry in `DEFAULT_PACKAGE_BANKS`. |
| `TRYOUTS.md` (line 485-486) | Lists 4 packages including "Video Belajar", notes it gets 0 tryout slots. |
| `prisma/seed.ts` (line 25, 36) | `view_videos` permission seeded for `user` role. |
| `TODO.md` | No video tasks listed. Only 2 items: Tailwind color classes and inline function refactoring. |
| `TASKS.md` | Not found in repo. |

**No tests cover video** — grep for `video` in `*.test.*` files returned zero matches.

---

## Gaps Summary

1. **No DB model** — need at minimum a `Video` table (or `Module`/`Lesson`), with fields for title, description, URL/embed, category, duration, sort order, maybe free/premium flag, relations to packages/users.
2. **No API routes** — CRUD needed: `GET /api/videos`, `POST /api/videos`, `PUT /api/videos/:id`, `DELETE /api/videos/:id`. Possibly a public/authenticated filter.
3. **No admin panel** — table listing, upload form, edit/delete modals needed under `app/admin/video/`.
4. **No storage strategy** — YouTube embed vs Supabase video upload vs external CDN. Upload route currently blocks video MIME types.
5. **No purchase gating** — `Paket Video Belajar` exists as a package but no logic grants video access on purchase.
6. **No hooks or queries** — TanStack Query hooks for video CRUD absent.
7. **"Dalam Pengembangan"** — user-facing page literally tells users it's not ready. The `Coming soon` badges confirm this.

---

## Notable References

- `db/migrate-v1-to-v2.sql` + `db/schema.sql` — both include `view_videos` permission in user role seed (legacy SQL, not active).
- `scripts/reset-and-seed.ts` — same permission seeding as `prisma/seed.ts`.
- `data/packages.ts:9` — "Paket Video Belajar" priced at Rp 250,000 —**paying users would currently get nothing**.
