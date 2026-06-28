# video-pembelajaran Specification

## Purpose
The Video Pembelajaran feature provides an end-to-end learning video catalog for the FIX ASN LMS. Admins curate a list of YouTube-embedded learning videos organized into three categories — TWK (Wawasan Kebangsaan), TIU (Intelegensia Umum), and TKP (Karakteristik Pribadi) — via a CRUD interface at `/admin/video`. Users with an active purchase of a `Package` whose `includesVideoPembelajaran` flag is set can browse the catalog at `/video` and watch any video in a modal YouTube player. Users without access see a locked upgrade card with a "Beli Paket" call to action. Access is derived from a non-rejected, non-expired, non-blocked `UserPurchase` against a video-enabled package; the `Package.isTrial` flag is independent. Storage is YouTube-embed only: each row stores the 11-character `youtubeId`, and the embed URL is built client-side. A Content-Security-Policy header permits the YouTube iframe domain so the player works in production.
## Requirements
### Requirement: Schema persists video catalog
The system SHALL persist videos in a `Video` table with the fields required to render, group, sort, gate, and audit them.

#### Scenario: Video row shape
- **WHEN** an admin creates a video
- **THEN** the row stores `title`, `description` (nullable), `youtubeId` (11-char `[A-Za-z0-9_-]{11}`), `category` (one of `"TWK" | "TIU" | "TKP"`), `durationSec` (nullable), `sortOrder` (default 0), `isPublished` (default `false`), audit fields (`createdAt`, `createdBy`, `createdIP`, `updatedAt`, `updatedBy`, `updatedIP`), and `deletedAt` (nullable; set on soft-delete).

#### Scenario: Category is restricted to three values
- **WHEN** a client attempts to create or update a video with `category` outside `{"TWK","TIU","TKP"}`
- **THEN** the server rejects the request with HTTP 400 and a clear error message.

#### Scenario: youtubeId is validated server-side
- **WHEN** a client posts a YouTube URL or raw id
- **THEN** the server extracts the 11-char id via `parseYouTubeId`
- **AND** if the result is `null` or does not match `^[A-Za-z0-9_-]{11}$`, the server rejects with HTTP 400.

#### Scenario: Index supports the user list query
- **WHEN** the user route queries published videos grouped by category
- **THEN** the database uses the `videos(category, isPublished, sortOrder)` index.

### Requirement: Package flag controls video access eligibility
The system SHALL mark packages whose purchase grants video access with a `Package.includesVideoPembelajaran` boolean.

#### Scenario: Default is false
- **WHEN** a new package is created
- **THEN** `includesVideoPembelajaran` defaults to `false`.

#### Scenario: Admin toggles the flag
- **WHEN** an admin sets `Package.includesVideoPembelajaran = true` for a package
- **THEN** the value is persisted and surfaced in `mapPackage` for both the list and the per-id package responses.

### Requirement: User access derives from non-rejected purchase
The system SHALL grant video access to a user when (a) their role is `admin`, OR (b) they have a `UserPurchase` row whose `status` is not in `{rejected, expired}` AND whose `package.includesVideoPembelajaran === true`.

#### Scenario: Pending purchase grants access
- **WHEN** a user has a `UserPurchase` with `status: "pending"` for a video-enabled package
- **THEN** `GET /api/videos` returns `hasAccess: true` and the published video list.

#### Scenario: Verified purchase grants access
- **WHEN** a user has a `UserPurchase` with `status: "verified"` for a video-enabled package
- **THEN** `GET /api/videos` returns `hasAccess: true` and the published video list.

#### Scenario: Rejected purchase denies access
- **WHEN** the only qualifying `UserPurchase` is `status: "rejected"`
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: Expired purchase denies access
- **WHEN** the only qualifying `UserPurchase` is `status: "expired"`
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: No purchase at all denies access
- **WHEN** a user has no `UserPurchase` rows
- **THEN** `GET /api/videos` returns `hasAccess: false`, `videos: []`, and `accessReason: "no_video_package"`.

#### Scenario: Admin role short-circuits
- **WHEN** the caller has role `admin`
- **THEN** `GET /api/videos` returns `hasAccess: true` and all published videos, regardless of purchases.

#### Scenario: Trial flag is irrelevant
- **WHEN** a user has a `UserPurchase` for a package where `isTrial: true` but `includesVideoPembelajaran: false`
- **THEN** `GET /api/videos` returns `hasAccess: false`.

### Requirement: Unauthenticated requests are rejected
The system SHALL require an active session for `GET /api/videos` and any `/api/admin/videos*` route.

#### Scenario: No session
- **WHEN** a request reaches `/api/videos` or `/api/admin/videos*` without an active session
- **THEN** the server returns HTTP 401.

#### Scenario: Non-admin caller on admin route
- **WHEN** a user with role `user` requests `GET/POST/PUT/DELETE /api/admin/videos*`
- **THEN** the server returns HTTP 403.

### Requirement: Admin can list, create, update, and soft-delete videos
The system SHALL provide admin-only CRUD endpoints for the `Video` model.

#### Scenario: Admin GET returns all videos including drafts
- **WHEN** an admin calls `GET /api/admin/videos`
- **THEN** the response includes all videos whose `deletedAt IS NULL`, including `isPublished: false` rows, ordered by `(category ASC, sortOrder ASC)`.

#### Scenario: Admin POST creates a video
- **WHEN** an admin POSTs a valid body
- **THEN** the server returns HTTP 201 and the created video.

#### Scenario: Admin POST rejects bad input
- **WHEN** an admin POSTs a body with empty `title`, invalid `youtubeId`, or unknown `category`
- **THEN** the server returns HTTP 400 with a descriptive error.

#### Scenario: Admin PUT updates fields
- **WHEN** an admin PUTs a partial body to `/api/admin/videos/[id]`
- **THEN** the server updates only the fields present in the body
- **AND** returns the updated video with refreshed `updatedAt`.

#### Scenario: Admin DELETE soft-deletes
- **WHEN** an admin calls `DELETE /api/admin/videos/[id]`
- **THEN** the server sets `deletedAt = now()` on that row
- **AND** the video is excluded from `GET /api/videos` and from the admin list filter `deletedAt IS NULL`.

#### Scenario: Admin route 404s missing or already-deleted
- **WHEN** an admin calls `GET/PUT/DELETE /api/admin/videos/[id]` with an id that doesn't exist or is already soft-deleted
- **THEN** the server returns HTTP 404.

### Requirement: User list excludes drafts and soft-deleted
The system SHALL return only published, non-deleted videos to authenticated users with access.

#### Scenario: Draft hidden from user
- **WHEN** a video has `isPublished: false`
- **THEN** `GET /api/videos` does not include it, even for users with access.

#### Scenario: Soft-deleted hidden from user
- **WHEN** a video has `deletedAt IS NOT NULL`
- **THEN** `GET /api/videos` does not include it.

#### Scenario: User list ordering
- **WHEN** `GET /api/videos` returns videos
- **THEN** the list is ordered by `(category ASC, sortOrder ASC)`.

### Requirement: User page renders three states
The user-facing `/video` page SHALL render exactly one of: loading, locked, empty, or catalog.

#### Scenario: Loading state
- **WHEN** `useUserVideos()` is fetching
- **THEN** the page shows a loading spinner.

#### Scenario: Locked state
- **WHEN** `useUserVideos()` resolves with `hasAccess: false`
- **THEN** the page renders a card with the heading "🔒 Video Belajar", the package name + price, and a "Beli Paket" button that links to `/buy`.

#### Scenario: Empty state
- **WHEN** `useUserVideos()` resolves with `hasAccess: true` and `videos: []`
- **THEN** the page renders "Belum ada video. Admin sedang menyiapkan materi." (no "Dalam Pengembangan" banner).

#### Scenario: Catalog state
- **WHEN** `useUserVideos()` resolves with `hasAccess: true` and `videos.length > 0`
- **THEN** the page groups videos by `category` (TWK → TIU → TKP, in that order) and renders each group with a color-coded header and a list of video rows.

#### Scenario: Mulai opens player modal
- **WHEN** a user with access clicks the "Mulai" button on a video row
- **THEN** the page opens a modal containing an `<iframe>` with `src="https://www.youtube.com/embed/{youtubeId}?rel=0"`.

### Requirement: Admin page exposes full CRUD
The `/admin/video` page SHALL provide a catalog table, an add modal, an edit modal, and a delete action.

#### Scenario: Catalog table
- **WHEN** an admin opens `/admin/video`
- **THEN** the page renders a list of all non-deleted videos in a desktop table and a mobile card list, showing category, title, YouTube id, duration, sort order, status (Published/Draft), and action buttons.

#### Scenario: Add modal
- **WHEN** an admin clicks "Tambah Video"
- **THEN** a modal opens with a form for title, description, YouTube URL/id, category (TWK/TIU/TKP), duration (seconds), sort order, and a publish toggle.

#### Scenario: YouTube URL preview
- **WHEN** an admin types a full YouTube URL or 11-char id in the form
- **THEN** the form shows a live preview of the parsed id and a "Preview on YouTube" link that opens the URL in a new tab.

#### Scenario: Edit populates form
- **WHEN** an admin clicks "Edit" on a video row
- **THEN** the modal opens with the form pre-filled from that video's fields.

#### Scenario: Soft-delete confirmation
- **WHEN** an admin clicks "Hapus" on a video row
- **THEN** the page asks for confirmation
- **AND** on confirm, calls `DELETE /api/admin/videos/[id]`
- **AND** on success, removes the row from the cached admin list and from any user-facing `['user-videos']` queries that include it.

### Requirement: Admin sidebar exposes the page
The system SHALL add a "Video Belajar" entry to the admin sidebar that routes to `/admin/video`.

#### Scenario: Sidebar entry visible
- **WHEN** an admin is logged in
- **THEN** the sidebar shows "🎬 Video Belajar" between the existing entries.

#### Scenario: Click navigates
- **WHEN** an admin clicks the entry
- **THEN** the router pushes to `/admin/video`.

### Requirement: Dashboard reflects live state
The user dashboard SHALL replace its placeholder "Coming soon" video badge with live state derived from `useUserVideos()`.

#### Scenario: Active access
- **WHEN** `useUserVideos()` returns `hasAccess: true`
- **THEN** the "Akses Video" stat card shows a green "Aktif" badge
- **AND** the progress section shows a "Tonton video belajar →" CTA linking to `/video`.

#### Scenario: No access
- **WHEN** `useUserVideos()` returns `hasAccess: false`
- **THEN** the "Akses Video" stat card shows a gray "Locked" badge
- **AND** the progress section shows a "Beli paket" CTA linking to `/buy`.

### Requirement: Package form exposes the flag
The admin package form SHALL include a "Termasuk Video Pembelajaran" checkbox bound to `Package.includesVideoPembelajaran`.

#### Scenario: Editing an existing package
- **WHEN** an admin opens the package edit form
- **THEN** the checkbox is checked iff `package.includesVideoPembelajaran === true`.

#### Scenario: Submitting with the flag toggled
- **WHEN** an admin submits the form with the checkbox changed
- **THEN** the server stores the new value
- **AND** the change is reflected in the next `GET /api/packages` response.

### Requirement: CSP allows YouTube embeds
The system SHALL serve a `Content-Security-Policy` header that permits `frame-src https://www.youtube.com`.

#### Scenario: Iframe loads in dev
- **WHEN** a user opens the player modal
- **THEN** the YouTube iframe renders without a CSP-block warning in the browser console.

### Requirement: Purchase invalidates the video cache
The system SHALL refresh the user video query after a successful purchase.

#### Scenario: Post-purchase refresh
- **WHEN** `useCreatePayment` resolves successfully with a `verified`-status payment
- **THEN** the `useUserVideos` cache is invalidated
- **AND** the next visit to `/video` reflects the new access state without a manual refresh.

### Requirement: Seed sets the flag and sample videos
The seed script SHALL mark `Paket Video Belajar` with `includesVideoPembelajaran: true` and insert 3 sample videos (one per category) on a find-or-create basis.

#### Scenario: Idempotent re-seed
- **WHEN** `npx tsx prisma/seed.ts` is run multiple times
- **THEN** the `Paket Video Belajar` row retains `includesVideoPembelajaran: true`
- **AND** the sample videos are inserted only once (no duplicates).

#### Scenario: Re-seed preserves admin changes
- **WHEN** an admin has manually set `Package.includesVideoPembelajaran` on a different package
- **AND** the seed script is re-run
- **THEN** the admin's choice is preserved (the seed `update:` block does not overwrite the flag).

