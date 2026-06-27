## Context

The "Video Pembelajaran" placeholder at `app/(user)/video/page.tsx` is 170 lines of hardcoded `VideoItem[]` with a "Dalam Pengembangan" banner. Each item has fake `title`, `duration`, `views`. Clicking "Mulai" opens a Modal saying "akan segera hadir"; the "📥 PDF" button downloads a `.txt` placeholder blob. The user dashboard `DashboardHomeClient.tsx` shows an "Akses Video: Belum" `StatCard` and a "🎬 Video Coming soon" badge on the progress section. The "Paket Video Belajar" is defined in `data/packages.ts:5-10` at Rp 250,000 but has no fulfillment path.

This change replaces the placeholder with a real, gated, admin-curated catalog of YouTube-embedded learning videos. Delivery surface is YouTube-embed-only (no Supabase video storage, no transcoding), gated by a new `Package.includesVideoPembelajaran` flag, and managed by an admin CRUD interface at `/admin/video`.

The closest existing analog is the `soal` (questions) admin flow: `app/admin/soal/` + `components/admin/SoalTable.tsx` + `app/api/questions/`. The new video admin reuses the same table/modal/mutation patterns.

## Goals / Non-Goals

**Goals:**
- Replace the placeholder user page with a real catalog sourced from `Video` rows.
- Give admins a CRUD surface to manage videos end-to-end.
- Gate catalog access by `UserPurchase` of a `Package` whose `includesVideoPembelajaran: true`.
- Embed YouTube videos via `https://www.youtube.com/embed/{id}?rel=0` in a modal player.
- Keep the change atomic: schema + API + admin UI + user UI + tests + seed + CSP all in one PR.
- Match existing project conventions (Prisma, NextAuth, TanStack Query, co-located Vitest).

**Non-Goals:**
- Self-hosted video upload (Supabase, S3, Bunny, etc.) — locked to YouTube embed.
- Per-video progress tracking, watch history, "continue watching", completion %.
- Video likes, comments, ratings.
- Auto-generated PDF companion per video.
- Per-package video scoping (`Video.packageId` field) — defer; not needed since access derives from the package flag, not row-level.
- Pagination on user list — assume catalog stays <100 items.
- Bulk CSV import.
- Categories beyond TWK/TIU/TKP (no UMUM bucket — D2).
- View count tracking (removes the placeholder `views` field — it was fake).
- `youtube-nocookie.com` mode — D3 locks to standard embed.
- Auto-detecting YouTube URL on the client before submit — `parseYouTubeId` handles full URLs on the server.

## Decisions

### 1. Schema: new `Video` model

`prisma/schema.prisma`, add at the end of the file:

```prisma
model Video {
  id          Int      @id @default(autoincrement())
  title       String   @db.Text
  description String?  @db.Text
  youtubeId   String   @db.Text
  category    String   @db.Text           // "TWK" | "TIU" | "TKP"
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

**`category: String` (not enum)** — matches `Question.category: String` convention. Validated at API boundary against `["TWK","TIU","TKP"]`. Avoids Prisma enum migration if categories change.

**No `packageId` FK** — access derives from user's purchase of any package with the flag, not row-level. Adding `packageId` later is non-breaking.

**`@db.Timestamptz(6)` / `@db.Text`** — matches existing `Question` / `Tryout` conventions.

**Audit fields** (`createdBy`, `createdIP`, `updatedBy`, `updatedIP`) — match existing patterns. Populated from session + `AsyncLocalStorage` IP, similar to other admin routes.

### 2. `Package` model — add flag

```prisma
  includesVideoPembelajaran Boolean @default(false)
```

Defaults to `false` so existing rows are unchanged. Admin can flip on per package.

### 3. Access matrix

The user route (`GET /api/videos`) returns `{ videos, hasAccess, accessReason }`. The `hasAccess` derivation:

```
hasAccess = (role === "admin")
         || exists(
              UserPurchase
                where userId = session.user.email
                  AND status NOT IN ["rejected", "expired"]
                  AND package.includesVideoPembelajaran === true
            )
```

**`UserPurchase.status` semantics (D1):**
- `pending` → access (legitimate buyer waiting for admin verification)
- `verified` / `paid` → access
- `rejected` / `expired` → no access
- This matches `tryout-attempts/resume` exactly.

**Admin override:** admin role short-circuits to `hasAccess: true` and returns all published videos (excludes `deletedAt`-soft-deleted).

**No 403 for users with `hasAccess: false`.** Return `200` with empty `videos[]` and `hasAccess: false`. The UI renders the upgrade banner; 403 would force the client to handle error states and lose the affordance to upsell the package.

### 4. Categories: 3 only (D2)

`VideoCategory = "TWK" | "TIU" | "TKP"`. Admin form has 3 toggle buttons. User UI groups videos by category. No `UMUM` bucket.

### 5. YouTube: standard embed (D3)

```html
<iframe
  src="https://www.youtube.com/embed/{youtubeId}?rel=0"
  className="w-full aspect-video rounded-xl"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
  title={title}
/>
```

`?rel=0` reduces "more videos" recommendations. `allow` permissions match YouTube's recommended set for an embeddable player.

### 6. `parseYouTubeId` — accept URLs or raw IDs

`lib/video.ts` exports a pure function. Used by:
- Admin form (lets admin paste `https://youtu.be/...` or raw 11-char id)
- Server `POST /api/admin/videos` (defense-in-depth re-parse; never trust the client)

**Accepted inputs (return 11-char id):**
- `https://www.youtube.com/watch?v=ABCDEFGHIJK`
- `https://www.youtube.com/watch?v=ABCDEFGHIJK&t=42s` (strips `&t=...`)
- `https://youtu.be/ABCDEFGHIJK`
- `https://www.youtube.com/embed/ABCDEFGHIJK`
- `https://m.youtube.com/watch?v=ABCDEFGHIJK` (mobile)
- `https://www.youtube.com/shorts/ABCDEFGHIJK` (Shorts)
- `ABCDEFGHIJK` (raw 11-char `[A-Za-z0-9_-]{11}`)

**Rejected (return `null`):**
- Empty / null / undefined.
- Length ≠ 11 after extraction.
- Charset contains anything outside `[A-Za-z0-9_-]`.
- Unrecognized URL host.

**Final server validation:** regex `^[A-Za-z0-9_-]{11}$` after `parseYouTubeId` runs. Reject with 400 if null.

### 7. Trial flag is independent of video access (D4)

The access check uses **only** `Package.includesVideoPembelajaran`. The `Package.isTrial` flag is irrelevant to video access. A free trial package can choose to set the video flag (and grant access) or not — purely an admin configuration decision. No combined logic like `isTrial || includesVideoPembelajaran`.

### 8. Admin CRUD pattern — mirror `soal`

`app/admin/video/page.tsx` (Client Component) reuses the same shape as `app/admin/soal/page.tsx`:
- Catalog table (desktop) + card list (mobile, via `data-testid` selectors) in `components/admin/video/VideoTable.tsx`.
- Add/Edit modal body in `components/admin/video/VideoForm.tsx` — controlled form, parses YouTube input via `parseYouTubeId`, surfaces parsed id live.
- Mutation wiring via the 4 admin hooks (see §10).

Admin GET returns **all** videos including drafts and soft-deleted, so admin can manage the full lifecycle. Soft-deleted rows show with a strikethrough + "Dihapus" badge in the table.

### 9. User page: three branches

`app/(user)/video/page.tsx` (Client Component, ~220 lines):

```
const { data, isLoading, error } = useUserVideos();
if (isLoading) return <Spinner />;
if (error) return <ErrorState />;
if (data.hasAccess === false) return <LockedCard />;
if (data.videos.length === 0) return <EmptyState />;
return <Catalog groups={data.videos} />;  // grouped by category
```

**LockedCard:** "🔒 Video Belajar" heading, package name + price, "Beli Paket" button → `/buy`.

**Catalog:** groups videos by `category` (TWK/TIU/TKP in fixed order). Each row: thumbnail (`https://i.ytimg.com/vi/{id}/mqdefault.jpg`), title, duration, "Mulai" button. Mulai opens the player modal.

**EmptyState:** "Belum ada video. Admin sedang menyiapkan materi." (no "Dalam Pengembangan" banner — that wording is misleading once the catalog can be populated).

### 10. Hooks: new `useVideoQueries.ts`

| Export | queryKey | API | Notes |
|---|---|---|---|
| `useAdminVideos()` | `['admin-videos']` | `GET /api/admin/videos` | Includes unpublished + soft-deleted. |
| `useCreateVideo()` | — | `POST /api/admin/videos` | Invalidates `['admin-videos']` on success. |
| `useUpdateVideo()` | — | `PUT /api/admin/videos/[id]` | Optimistic merge + rollback on error. |
| `useDeleteVideo()` | — | `DELETE /api/admin/videos/[id]` | Optimistic remove + invalidate. |
| `useUserVideos()` | `['user-videos']` | `GET /api/videos` | `staleTime: 60_000`. Returns `VideoListResponse`. |

Plus one cross-hook line: `useCreatePayment.onSuccess` in `hooks/useTryoutQueries.ts` adds `queryClient.invalidateQueries({ queryKey: ['user-videos'] })` so post-purchase the video page flips from locked to unlocked without a manual refresh.

### 11. CSP header (D6)

`next.config.ts` `headers()` adds:

```ts
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    // ... existing directives ...
    "frame-src https://www.youtube.com",
    "img-src 'self' data: https:",
    // ...
  ].join("; "),
}
```

(Exact format matches the existing CSP entry style. Read `next.config.ts` first to splice in cleanly.)

### 12. Migration workflow (D5)

- **Local dev:** `npx prisma db push` (fast iteration; DB is reseeded idempotently via `npx tsx prisma/seed.ts`).
- **Staging / prod:** `npx prisma migrate dev --name add_video_and_package_video_flag --create-only` → commit `prisma/migrations/<ts>_.../migration.sql` → review → `npx prisma migrate deploy`.

### 13. Seed updates

`prisma/seed.ts` package upsert (find by `name`):

```ts
await prisma.package.upsert({
  where: { name: p.name },
  create: {
    name: p.name,
    description: p.description,
    price: p.price,
    isTrial: p.isTrial,
    startDate: p.startDate,
    endDate: p.endDate,
    includesVideoPembelajaran: p.name === "Paket Video Belajar",
  },
  update: {
    startDate: p.startDate,
    endDate: p.endDate,
    // intentionally do NOT touch includesVideoPembelajaran — preserve admin's choice
  },
});
```

Sample videos — find-or-create by `(title, category)`, no natural unique key. Use only safe placeholder YouTube IDs that we explicitly disclaim as dev-only; replace before any non-dev deploy.

### 14. Tests (Vitest, co-located)

| File | Covers |
|---|---|
| `lib/video.test.ts` | `parseYouTubeId` URL/id extraction edge cases. |
| `hooks/useVideoQueries.test.ts` | All 5 hooks: query keys, fetch URLs, optimistic update + rollback, invalidation. |
| `app/api/admin/videos/route.test.ts` | GET (admin) returns all incl unpublished; POST validation (bad youtubeId/category/title → 400); 401/403 auth matrix. |
| `app/api/admin/videos/[id]/route.test.ts` | PUT updates fields; DELETE soft-deletes; 404 on missing/soft-deleted; 403 on user role. |
| `app/api/videos/route.test.ts` | User without purchase → `{videos:[], hasAccess:false}`; user with pending/verified → published only; admin → all published; soft-deleted excluded; 401 unauth. |
| `components/admin/video/VideoTable.test.tsx` | Desktop + mobile render; edit/delete buttons fire handlers; empty state; soft-deleted row styling. |
| `components/admin/video/VideoForm.test.tsx` | URL parser preview, validation errors, submit shape, category toggle, publish toggle. |
| `app/(user)/video/page.test.tsx` | Branches: loading / locked / empty / catalog / player modal open. |

## Risks / Trade-offs

| # | Risk | Mitigation |
|---|---|---|
| R1 | **`prisma db push` for dev** can drift from migration history. | Migration files generated locally; CI uses `migrate deploy` so drift is caught on staging. |
| R2 | **Existing `Paket Video Belajar` buyers** get instant access on deploy (they were seeing placeholder). | Acceptable. Seed sets flag = true. No negative UX; they previously saw "dalam pengembangan" anyway. |
| R3 | **YouTube embed CSP** — without `frame-src`, the iframe is blocked. | `next.config.ts` header added in this change (D6). Verified with browser devtools. |
| R4 | **YouTube ID collision / typo.** Admin enters bad ID. | Server regex validation (400); admin form "Preview on YouTube" link surfaces typos early. |
| R5 | **Catalog cardinality.** >100 videos blows up the user GET. | Defer pagination. Add `?category=TWK` filter later if needed. |
| R6 | **`useUserVideos` stale after purchase.** | `useCreatePayment.onSuccess` invalidates `['user-videos']` (one-line addition). |
| R7 | **`view_videos` permission is now unused.** | No code change. Optional cleanup in a follow-up. |
| R8 | **Soft-deleted videos in admin list** — admin sees them and can un-delete. | Show with strikethrough + "Dihapus" badge. DELETE is reversible. |
| R9 | **Mobile modal iframe height** — `aspect-video` may overflow on small phones. | `components/ui/Modal.tsx` already handles `width`; iframe scales via `w-full aspect-video`. Test on a 360px viewport. |
| R10 | **`useUpdateVideo` optimistic rollback** on conflict. | Mirror `useUpdateTryout` pattern in `useTryoutQueries.ts`; reuse `useQueryClient` invalidation on error. |
| R11 | **Next 16 async `params`.** `[id]` route handlers must type `params: Promise<{id: string}>`. | Mirror `app/api/tryouts/[tryoutId]/route.ts` shape. |
| R12 | **`@db.Timestamptz(6)` mismatch with existing `Question` / `Tryout`** — already use this convention. | No action. |
| R13 | **No view-count tracking.** Old placeholder had fake `views`. | Removed entirely. Out of scope. |
