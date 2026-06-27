## Why

The "Video Pembelajaran" feature is **scaffolded only**. The user-facing page (`app/(user)/video/page.tsx`) renders a "Dalam Pengembangan" placeholder with hardcoded fake data. Navigation, dashboard badges, and landing-page marketing copy all promise a video learning catalog. The "Paket Video Belajar" is sold at Rp 250,000 in the store, but buying it delivers nothing — there is no Video model, no admin UI to add videos, no API, and no storage strategy.

A scout of the codebase on 2026-06-27 (run `206c85fa`) confirmed the gap end-to-end:

- **Have:** placeholder page, sidebar/bottom-nav links, dashboard "Coming soon" badge, "Paket Video Belajar" row in `data/packages.ts`, `view_videos` permission seeded.
- **Missing:** Prisma `Video` model, `Package.includesVideoPembelajaran` flag, admin CRUD UI, all API routes, hooks, tests, and any YouTube/integration plumbing.

This change closes the gap with a delivery surface that's production-grade, ships inside one feature, and respects existing project conventions (Prisma + NextAuth + TanStack Query + Supabase for image upload only).

## What Changes

- **Schema:** new `Video` Prisma model + `Package.includesVideoPembelajaran` boolean.
- **Migration:** generated SQL via `prisma migrate dev`; local dev uses `prisma db push`; prod uses `migrate dev --create-only` → review → `migrate deploy`.
- **API:** admin routes `GET/POST /api/admin/videos`, `GET/PUT/DELETE /api/admin/videos/[id]`; user route `GET /api/videos`.
- **Admin UI:** new `/admin/video` page with table, add/edit modal, soft-delete, publish toggle, category filter, sort order, "Preview on YouTube" link.
- **User UI:** replace `app/(user)/video/page.tsx` placeholder with real data; three render branches (loading / locked / catalog / empty). Modal player embeds `https://www.youtube.com/embed/{id}?rel=0`.
- **Dashboard:** `DashboardHomeClient` swaps "Coming soon" badges for live `useUserVideos()` state.
- **Hooks:** new `hooks/useVideoQueries.ts` with 5 exports (admin list/create/update/delete + user list).
- **Lib:** new `lib/video.ts` with pure `parseYouTubeId` helper.
- **CSP:** `next.config.ts` adds `frame-src https://www.youtube.com` to response headers.
- **Types:** extend `lib/types.ts` with `Video`, `VideoCategory` (`"TWK" | "TIU" | "TKP"`), `VideoListResponse`; extend `Package` with `includesVideoPembelajaran`.
- **Mappers:** `mapPackage` in both `app/api/packages/route.ts` and `app/api/packages/[packageId]/route.ts` must surface the new field.
- **Package admin UI:** add "Termasuk Video Pembelajaran" checkbox to the package edit/create form in `app/admin/settings/page.tsx`.
- **Admin nav:** add "🎬 Video Belajar" entry to `components/layouts/AdminSidebar.tsx`.
- **Seed:** `prisma/seed.ts` sets `includesVideoPembelajaran: true` on `Paket Video Belajar`; inserts 3 sample videos (TWK/TIU/TKP) on a find-or-create basis.
- **Tests:** co-located Vitest specs for routes, hooks, components, and `parseYouTubeId`.

### Locked Decisions (resolved via grill-me interview 2026-06-27)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Purchase access = any non-rejected `UserPurchase` row** (status ∉ {`rejected`, `expired`}). Matches `tryout-attempts/resume` convention. | Best UX for legitimate pending buyers; consistent with existing tryout gate. |
| D2 | **Categories: 3 only** (`TWK` / `TIU` / `TKP`). | Matches current placeholder UI. No `UMUM` bucket. |
| D3 | **YouTube domain: `youtube.com/embed`** (standard, not `youtube-nocookie`). | Simplest. Privacy not a stated requirement. |
| D4 | **Trial flag is independent of video access.** `Package.isTrial` is ignored; only `Package.includesVideoPembelajaran` decides. | Cleanest gate; no combined logic. |
| D5 | **Migration workflow: hybrid.** `prisma db push` for local dev (DB seed is idempotent); `migrate dev --create-only` + manual review + `migrate deploy` for staging/prod. | Safe prod path; fast dev iteration. |
| D6 | **CSP header change ships with this PR.** `frame-src https://www.youtube.com` added to `next.config.ts`. | Atomic feature; no half-broken embed state. |

## Capabilities

### New Capabilities
- `video-pembelajaran`: end-to-end video learning feature — admin CRUD on a `Video` catalog, user-facing gated list, YouTube embed player, package-based access control.

### Modified Capabilities
- None. The new `Package.includesVideoPembelajaran` field is additive and only consumed by the new `video-pembelajaran` capability. No existing capability's requirements change.

## Impact

**Files to add (12):**
| File | Purpose |
|---|---|
| `app/api/admin/videos/route.ts` | Admin: list + create. |
| `app/api/admin/videos/[id]/route.ts` | Admin: read + update + soft-delete. |
| `app/api/videos/route.ts` | User: list with `hasAccess` derivation. |
| `app/admin/video/page.tsx` | Admin CRUD page. |
| `components/admin/video/VideoTable.tsx` | Desktop + mobile list. |
| `components/admin/video/VideoForm.tsx` | Add/edit form modal body. |
| `hooks/useVideoQueries.ts` | 5 TanStack Query hooks. |
| `lib/video.ts` | `parseYouTubeId` helper. |
| `hooks/useVideoQueries.test.ts` | Hook unit tests. |
| `app/api/admin/videos/route.test.ts` | Admin list/create route tests. |
| `app/api/admin/videos/[id]/route.test.ts` | Admin id route tests. |
| `app/api/videos/route.test.ts` | User route tests (gate matrix). |
| `components/admin/video/VideoTable.test.tsx` | Table component tests. |
| `components/admin/video/VideoForm.test.tsx` | Form + `parseYouTubeId` tests. |
| `app/(user)/video/page.test.tsx` | User page tests (lock/catalog branches). |
| `VIDEO.md` | Living spec (mirror `TRYOUTS.md`). |

**Files to modify (10):**
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Video` model; add `Package.includesVideoPembelajaran`. |
| `prisma/seed.ts` | Set flag on `Paket Video Belajar`; add sample videos (find-or-create). |
| `prisma/migrations/<ts>_add_video_and_package_video_flag/migration.sql` | New (generated by `migrate dev`). |
| `scripts/reset-and-seed.ts` | Mirror seed changes. |
| `data/packages.ts` | Add `includesVideoPembelajaran: true` to `Paket Video Belajar`. |
| `lib/types.ts` | Add `Video`, `VideoCategory`, `VideoListResponse`; extend `Package`. |
| `app/api/packages/route.ts` | `mapPackage` surfaces new field. |
| `app/api/packages/[packageId]/route.ts` | `mapPackage` surfaces new field. |
| `app/admin/settings/page.tsx` | Add "Termasuk Video Pembelajaran" checkbox. |
| `app/(user)/video/page.tsx` | Full rewrite to use `useUserVideos()`. |
| `components/dashboard/DashboardHomeClient.tsx` | Swap "Coming soon" badges for live state. |
| `components/layouts/AdminSidebar.tsx` | Add "Video Belajar" nav entry. |
| `next.config.ts` | Add `frame-src https://www.youtube.com` to CSP headers. |
| `hooks/useTryoutQueries.ts` | `useCreatePayment.onSuccess` invalidates `['user-videos']`. |

**No breaking changes.** All new routes, new model field defaults to `false`, additive API fields, no existing component contract changes.

**Dependencies:**
- Existing `requireAdmin()` and `requireActiveSession()` guards in `lib/routeAuth.ts`.
- Existing `Modal`, `Card`, `Button`, `Badge` from `components/ui/`.
- Existing TanStack Query `QueryProvider` already wraps the app.
- YouTube iframe domain must be in CSP — handled in this change (D6).
