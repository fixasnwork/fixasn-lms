# Code Context: Video Pembelajaran (End-to-End)

> November 2026 update: see `PACKAGE_ACCESS.md`. Paid access now requires a verified, unexpired payment. Pending payments no longer unlock content. Package dates control sales only; individual access expires using the duration captured at checkout. This supersedes the older pending-access descriptions below.

Last updated: 2026-06-28. Living doc for the `video-pembelajaran` OpenSpec change. Mirrors `TRYOUTS.md` style. Use this as the canonical map when changing anything under `app/(user)/video/`, `app/admin/video/`, `components/admin/video/`, `app/api/admin/videos/`, `app/api/videos/`, or the related Prisma `Video` model.

Branch: `feature/video-pembelajaran` (4 stacked PRs; the spec is complete when all 4 merge).

---

## 1. Goal

End-to-end "Video Pembelajaran" feature:

1. Admins curate a catalog of YouTube-embedded learning videos (TWK / TIU / TKP categories).
2. Users with an active purchase of a `Package` whose `includesVideoPembelajaran = true` flag is set can browse and watch.
3. Users without a qualifying purchase see a locked upgrade card.
4. The user dashboard reflects live access state and links into the catalog.

Storage: **YouTube embed only**. No upload pipeline. `youtubeId` (11-char) is stored; the embed URL is built client-side at render time.

---

## 2. Locked decisions (from contract §1, `proposal.md`)

| # | Decision | Why |
|---|---|---|
| D1 | Access = `UserPurchase` with `status NOT IN {rejected, expired, blocked}` | Best UX for legitimate pending buyers; matches `tryout-attempts/resume` convention |
| D2 | 3 categories: `TWK` / `TIU` / `TKP` | Matches the original placeholder UI; no "UMUM" bucket |
| D3 | YouTube embed: `youtube.com/embed` (standard, not nocookie) | Privacy not a stated requirement |
| D4 | `Package.isTrial` is independent of video access | Cleanest gate; no combined logic |
| D5 | Dev: `prisma db push`. Prod: `migrate dev --create-only` + review + `migrate deploy` | Safe prod path; fast dev iteration |
| D6 | CSP `frame-src https://www.youtube.com` ships in this stack | Atomic feature; no half-broken embed state |

---

## 3. Schema (`prisma/schema.prisma`)

```prisma
model Video {
  id          Int      @id @default(autoincrement())
  title       String   @db.Text
  description String?  @db.Text
  youtubeId   String   @db.Text            // 11-char YouTube video id
  category    String   @db.Text            // "TWK" | "TIU" | "TKP" — validated at API boundary
  durationSec Int?     @db.Integer
  sortOrder   Int      @default(0)
  isPublished Boolean  @default(false)

  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  createdBy   String?   @db.Text
  createdIP   String?   @db.Text
  updatedAt   DateTime  @updatedAt       @db.Timestamptz(6)
  updatedBy   String?   @db.Text
  updatedIP   String?   @db.Text
  deletedAt   DateTime? @db.Timestamptz(6)

  @@index([category, isPublished, sortOrder])
  @@map("videos")
}
```

Plus `Package.includesVideoPembelajaran Boolean @default(false)` (additive column).

Migration: `prisma/migrations/20260627000000_add_video_and_package_video_flag/migration.sql` (PR 1).

**No FK from `Video` to `Package`.** Access is derived from the user's purchase of any package with the flag set, not from a per-video package link. Adding a `packageId` later is non-breaking.

---

## 4. API (PR 2)

| Route | Methods | Auth | Behavior |
|---|---|---|---|
| `/api/admin/videos` | `GET` `POST` | `requireAdmin()` | List all non-deleted (incl. drafts) ordered `category, sortOrder`. Create with full validation. |
| `/api/admin/videos/[id]` | `GET` `PUT` `DELETE` | `requireAdmin()` | Single-row CRUD. `DELETE` is soft-delete via `deletedAt = now()`. |
| `/api/videos` | `GET` | `requireActiveSession()` | User-facing list. Admin role → all published. User role → check `UserPurchase` for `package.includesVideoPembelajaran && status NOT IN {rejected,expired,blocked}`. |

All three routes use `force-dynamic` + `revalidate=0`.

**Validation rules (all admin POST/PUT):**
- `title`: required, non-empty after trim
- `youtubeId`: must pass `parseYouTubeId` (URL or raw 11-char) AND match `^[A-Za-z0-9_-]{11}$`. 12+ char URLs are rejected (no silent truncation).
- `category`: must be in `{TWK, TIU, TKP}`. `UMUM` rejected.
- `durationSec`: optional, non-negative integer
- `sortOrder`: optional integer (default 0)
- `isPublished`: optional boolean (default false)

**`parseYouTubeId` (`lib/video.ts`)** — pure function. URL regexes are end-anchored with `(?=$|[?&#/])` (lookahead, non-consuming) to prevent silent 12+ char truncation. Raw 11-char IDs passthrough via `^[A-Za-z0-9_-]{11}$`.

**Helpers in `lib/video.ts`:**
- `parseYouTubeId(input): string | null`
- `mapVideo(row): Video` — shared across all 3 route files (extracted in PR 2)
- `ALLOWED_VIDEO_CATEGORIES: ReadonlyArray<VideoCategory>` = `["TWK", "TIU", "TKP"]`

---

## 5. User UI (PR 4)

`app/(user)/video/page.tsx` (Client Component). 4 render branches:

1. **Loading** — `useUserVideos().isLoading` → centered spinner
2. **Error** — `useUserVideos().error` → red banner "Gagal memuat video. Coba lagi nanti."
3. **Locked** — `!data.hasAccess` → 🔒 upgrade card + "Beli Paket" button → `/buy`
4. **Empty** — `data.hasAccess && data.videos.length === 0` → "Belum ada video. Admin sedang menyiapkan materi."
5. **Catalog** — `data.hasAccess && data.videos.length > 0` → grouped by `category` (TWK → TIU → TKP), each in a 1/2/3-col responsive grid

**Video card:**
- Thumbnail: `<Image src="https://i.ytimg.com/vi/{youtubeId}/mqdefault.jpg" />` (note `unoptimized` since i.ytimg.com isn't in `next.config.ts` remotePatterns)
- Title (line-clamp-2)
- Description (line-clamp-2, optional)
- Duration: `M:SS` if set
- "▶ Mulai" button → opens player modal

**Player modal:** `<Modal width=720>` containing `<iframe src="https://www.youtube.com/embed/{youtubeId}?rel=0">` with `aspect-video` + `allowFullScreen`. Closed by clicking outside or the close button. CSP `frame-src` already configured in `next.config.ts` (PR 1).

**Removed from placeholder:** "📥 PDF" download stub, "🔄 Dalam Pengembangan" banner, fake `views` counts. All gone.

### 5.1 Dashboard

`components/dashboard/DashboardHomeClient.tsx`:
- `useUserVideos()` exposes `hasVideoAccess`
- `StatCard` "Akses Video": `value="Aktif"` green (`#16A34A`) when hasAccess, `value="Locked"` gray (`#9CA3AF`) otherwise
- Progress section CTA: `Tonton video belajar →` linking to `/video` (has) or `Beli paket video →` linking to `/buy` (no access)

---

## 6. Admin UI (PR 3)

`app/admin/video/page.tsx` (Client Component):
- `useAdminVideos` → table
- "Tambah Video" button opens `VideoForm` modal in create mode
- Edit button on each row opens `VideoForm` modal in edit mode (pre-fills `initial` prop)
- Delete button → `window.confirm` → `useDeleteVideo.mutate(id)`
- 4 mutations wire to the 5 hooks from §7

`components/admin/video/VideoForm.tsx`:
- Local state: `title`, `description`, `youtubeInput` (raw), `parsedId` (derived via `parseYouTubeId` live), `category`, `durationSec`, `sortOrder`, `isPublished`
- Submit disabled when `!title.trim() || !parsedId`
- "Preview on YouTube" link visible when valid

`components/admin/video/VideoTable.tsx`:
- Desktop `<table>` (`data-testid="video-desktop-table"`) + mobile card list (`data-testid="video-mobile-list"`)
- Status badges: green "Published" / gray "Draft"
- Category badges: TWK=blue, TIU=purple, TKP=yellow
- Empty state when no videos

`components/layouts/AdminSidebar.tsx`:
- Added `{ id: 'video', icon: '🎬', label: 'Video Belajar' }` at index 4 (in `moreMobileItems`)

`app/admin/settings/page.tsx`:
- `PackageCreateModal` + `PackageCard` both get a "Termasuk Video Pembelajaran" checkbox bound to `pkg.includesVideoPembelajaran`
- Display mode shows `🎬 Video` badge when `pkg.includesVideoPembelajaran === true`

---

## 7. Hooks (PR 2)

`hooks/useVideoQueries.ts`:

| Hook | queryKey / mutation | API | Invalidation |
|---|---|---|---|
| `useAdminVideos()` | `['admin-videos']` | `GET /api/admin/videos` | (read) |
| `useCreateVideo()` | mutation | `POST /api/admin/videos` | `['admin-videos']`, `['user-videos']` on success |
| `useUpdateVideo()` | mutation | `PUT /api/admin/videos/[id]` | optimistic merge onMutate, rollback onError, `['admin-videos']`+`['user-videos']` onSettled |
| `useDeleteVideo()` | mutation | `DELETE /api/admin/videos/[id]` | optimistic remove onMutate, rollback onError, `['admin-videos']`+`['user-videos']` onSettled |
| `useUserVideos()` | `['user-videos']` | `GET /api/videos` | `staleTime: 60_000` |

**Cross-hook wiring (PR 2):** `useCreatePayment.onSuccess` in `hooks/useTryoutQueries.ts` also invalidates `['user-videos']` so a successful `Paket Video Belajar` purchase flips `/video` from locked to unlocked without manual refresh.

---

## 8. Tests

| File | Coverage |
|---|---|
| `lib/video.test.ts` | 22+ `parseYouTubeId` cases (URL forms, raw id, fragment, truncation guard) |
| `app/api/admin/videos/route.test.ts` | 9 cases: list, validation, 400 paths |
| `app/api/admin/videos/[id]/route.test.ts` | 14 cases: GET/PUT/DELETE happy + 400/404 |
| `app/api/videos/route.test.ts` | 4 cases: 401, hasAccess false/true, admin short-circuit, where-clause filter assertions |
| `hooks/useVideoQueries.test.ts` | 5 cases: queryKey, fetchUrl, optimistic merge + rollback, invalidation |
| `components/admin/video/VideoTable.test.tsx` | 5 cases: render modes, edit/delete handlers, empty state |
| `components/admin/video/VideoForm.test.tsx` | 7 cases: live parse, validation, category toggle, submit shape |
| `app/(user)/video/page.test.tsx` | 6 cases: 4 render branches + Mulai → modal open |

---

## 9. Risks (from `design.md` §14) and mitigations

| # | Risk | Status |
|---|---|---|
| R3 | CSP for YouTube embed | ✓ Mitigated PR 1 (`frame-src https://www.youtube.com`) |
| R4 | Catalog cardinality (>100 videos) | Deferred — pagination not in scope |
| R5 | Post-purchase cache stale | ✓ Mitigated PR 2 (`useCreatePayment.onSuccess` invalidates `['user-videos']`) |
| R7 | `VIEW_VIDEOS` permission unused | Accepted — implicit in package-gate; permission can be deprecated later |
| R9 | YouTube content moderation | Admin responsibility + "Preview on YouTube" link in form |
| R11 | Mobile modal iframe height | `aspect-video` + `Modal width=720`; test on 360px viewport |

---

## 10. Out of scope (deferred)

- Video upload (Supabase, S3, Bunny) — locked to YouTube embed
- Per-video progress tracking (last watched timestamp, % watched)
- Video likes, comments, ratings
- "Continue watching" resume
- PDF companion per video (old placeholder had a stub download — removed entirely)
- Per-package video scoping (`Video.packageId` field) — not needed; access is package-flag based
- Pagination on the user list — assume <100 published videos
- View count tracking
- Closed captions / transcript storage
- Bulk CSV import

---

## 11. Acceptance

Manual smoke (dev server):

1. Log in as admin → `/admin/video` → add 3 videos (TWK/TIU/TKP), publish all
2. Log in as user without purchase → `/video` → see "🔒 Video Belajar" locked card with "Beli Paket"
3. Admin: open package `Paket Video Belajar` → toggle "Termasuk Video Pembelajaran" → save
4. User with access → `/video` → see 3 category-grouped sections → click "▶ Mulai" → modal with iframe plays
5. Soft-delete a video in admin → user list shrinks immediately
6. Dashboard: "Akses Video" StatCard shows "Aktif" green; progress section shows "Tonton video belajar →"
7. Without access: StatCard shows "Locked" gray; progress section shows "Beli paket video →"
8. After successful `Paket Video Belajar` purchase, `/video` flips from locked to unlocked without manual refresh (cache invalidation)
