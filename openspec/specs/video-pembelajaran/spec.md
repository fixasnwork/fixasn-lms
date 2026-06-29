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
The system SHALL mark packages whose purchase grants video access with a `Package.includesVideoPembelajaran` boolean. The flag MUST be surfaced consistently across every read path that returns `Package` to the client (admin list, admin layout SSR prefetch, user buy page, user dashboard, packages-for-tryout linking), and every read path MUST coerce the raw database value to a definitive boolean at the boundary so that pre-migration rows with `NULL` are never serialized as `null` or `undefined` to the client.

#### Scenario: Default is false
- **WHEN** a new package is created
- **THEN** `includesVideoPembelajaran` defaults to `false`.

#### Scenario: Admin toggles the flag
- **WHEN** an admin sets `Package.includesVideoPembelajaran = true` for a package
- **THEN** the value is persisted
- **AND** the value is surfaced as `true` in every read path: the `mapPackage` of `app/api/packages/route.ts` (collection), the `mapPackage` of `app/api/packages/[packageId]/route.ts` (per-id), and the `['packages']` prefetch mapper of `app/admin/layout.tsx` (admin SSR prefetch used by `HydrationBoundary`).

#### Scenario: Legacy NULL rows render as false
- **WHEN** a `Package` row exists with `includesVideoPembelajaran IS NULL` (pre-migration data)
- **THEN** every read path's mapper coerces the value via `Boolean(...)` so the client receives `false` (not `null` or `undefined`)
- **AND** the admin settings page renders the "🎬 Video" badge as hidden
- **AND** the package edit form renders the "Video Pembelajaran" checkbox as unchecked
- **AND** no React "changing uncontrolled input to controlled" warning is emitted.

#### Scenario: Direct DB edit is visible after a normal page load
- **WHEN** an admin or operator changes `Package.includesVideoPembelajaran` directly in the database (Supabase Studio, `prisma db push`, manual SQL — outside the admin form)
- **THEN** the next mount of any page using `usePackages` reflects the new value without requiring a manual browser cache clear
- **AND** the `usePackages` TanStack Query hook does not pin the response with a `staleTime` longer than the default (`0`).

### Requirement: Admin SSR prefetch mirrors API mappers
The `['packages']` server-side prefetch in `app/admin/layout.tsx` (used by `HydrationBoundary` to seed the admin client cache) MUST produce package objects with the same field shape and value semantics as the `/api/packages` response. The prefetch mapper MUST include `includesVideoPembelajaran` and coerce it via `Boolean(...)`, exactly matching the coercion used by `mapPackage` in `app/api/packages/route.ts`. If a future field is added to the `Package` type and surfaced by the API mappers, it MUST also be added to the SSR prefetch mapper in the same change.

#### Scenario: Prefetch object shape matches API response
- **WHEN** a developer inspects the dehydrated TanStack Query state rendered into the admin page HTML
- **THEN** each package object in the `['packages']` query contains the same keys as the JSON returned by `GET /api/packages`
- **AND** `includesVideoPembelajaran` is present and is a JSON boolean (never `null`, never missing).

#### Scenario: First admin render reflects server data
- **WHEN** an admin opens `/admin/settings` and the server prefetch has populated the cache
- **THEN** the first paint of the page (before any client refetch) shows the correct "🎬 Video" badge state and the correct checkbox state for every package.

### Requirement: Component checkbox state is always controlled
Client components that render checkboxes or text inputs bound to a `Package` field MUST coerce the prop value to a safe default at `useState` initialization so that `null` or `undefined` from the API never causes a "changing uncontrolled input to controlled" React warning. The same defensive coercion MUST be applied to `BankAccount` text and boolean fields in the admin settings page.

#### Scenario: PackageCard edit form
- **WHEN** an admin opens the edit form for any package, including one with a pre-migration `NULL` flag
- **THEN** the `isTrial` and `includesVideoPembelajaran` checkboxes initialize to `Boolean(pkg.<field>)` (resolves `null`/`undefined` to `false`)
- **AND** the `name`, `description`, and `price` inputs initialize to `pkg.<field> ?? ''` / `?? 0`.

#### Scenario: BankCard edit form
- **WHEN** an admin opens the edit form for any bank account
- **THEN** text inputs initialize to `bank.<field> ?? ''`
- **AND** the `isActive` checkbox initializes to `Boolean(bank.isActive)`.

#### Scenario: No React uncontrolled-input warning
- **WHEN** an admin opens `/admin/settings` against a database with any `NULL` flag values
- **THEN** the browser console emits zero warnings of the form "A component is changing an uncontrolled input to be controlled."

### Requirement: User access derives from non-rejected purchase
The system SHALL grant video access to a user when (a) their role is `admin`, OR (b) they have a `UserPurchase` row whose `status` is not in `{rejected, expired}` AND whose `package.includesVideoPembelajaran === true`. The `UserPurchase` row MUST be created as a side effect of the payment lifecycle: `POST /api/payments` MUST upsert a `UserPurchase` for the same `(userId, packageId)` immediately after the `Payment` is created (pending payments grant access), `PUT /api/payments` MUST upsert the `UserPurchase` when the admin transitions a payment to `verified` (idempotent — handles payments that pre-date this fix), and `PUT /api/payments` MUST soft-delete the linked `UserPurchase` when the admin transitions a payment to `rejected` / `expired` / `blocked`. The upsert key SHALL be the `@@unique([userId, packageId])` constraint so re-submits, retries, and status flip-flops collapse to a single active grant per user per package.

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

#### Scenario: Payment creation grants access immediately
- **WHEN** a user successfully POSTs to `/api/payments` (with valid `packageId` and either an existing or new payment intent)
- **THEN** the server creates a `Payment` row AND upserts a `UserPurchase` row for the same `(userId, packageId)` with `paymentId` pointing at the new payment
- **AND** a subsequent `GET /api/videos` returns `hasAccess: true` for the buyer if the linked package has `includesVideoPembelajaran: true`.

#### Scenario: Admin verification is idempotent
- **WHEN** an admin PUTs a payment's `status` to `verified`
- **THEN** the server upserts a `UserPurchase` row for the payment's `(userId, packageId)` if one does not already exist
- **AND** if a soft-deleted `UserPurchase` already exists for that pair (e.g., a previously-rejected payment), the upsert MUST set `deletedAt: null` and re-activate the grant
- **AND** if an active `UserPurchase` already exists, the upsert MUST update `paymentId` to the verified payment and leave `deletedAt: null`.

#### Scenario: Admin deny revokes the access grant
- **WHEN** an admin PUTs a payment's `status` to `rejected`, `expired`, or `blocked`
- **THEN** the server soft-deletes the linked `UserPurchase` row by setting `deletedAt: now()`
- **AND** a subsequent `GET /api/videos` returns `hasAccess: false` for the buyer if the soft-deleted row was the only grant for a video-enabled package.

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
- **WHEN** a user with access clicks the "Mulai" button (or "▶ Lanjut dari m:ss" or "▶ Tonton Lagi") on a video card
- **THEN** the page opens a modal containing an `<iframe>` with `src="https://www.youtube.com/embed/{youtubeId}?rel=0&enablejsapi=1"`
- **AND** the embedded player is wrapped by a client component that wires `onReady` / `onStateChange` to the progress save logic.

#### Scenario: Modal close flushes save
- **WHEN** the user closes the player modal
- **THEN** any pending progress save is flushed via `navigator.sendBeacon` (or `fetch keepalive: true` fallback) before the modal unmounts.

### Requirement: Admin page exposes full CRUD
The `/admin/video` page SHALL provide a catalog table, an add modal, an edit modal, a PDF upload control, and a delete action.

#### Scenario: Catalog table
- **WHEN** an admin opens `/admin/video`
- **THEN** the page renders a list of all non-deleted videos in a desktop table and a mobile card list, showing category, title, YouTube id, duration, sort order, status (Published/Draft), and action buttons.
- **AND** each row with a PDF shows a "📄 N halaman" indicator in the actions column.

#### Scenario: Add modal
- **WHEN** an admin clicks "Tambah Video"
- **THEN** a modal opens with a form for title, description, YouTube URL/id, category (TWK/TIU/TKP), duration (seconds), sort order, a publish toggle, and a PDF file input (optional, can be added after creation).

#### Scenario: YouTube URL preview
- **WHEN** an admin types a full YouTube URL or 11-char id in the form
- **THEN** the form shows a live preview of the parsed id and a "Preview on YouTube" link that opens the URL in a new tab.

#### Scenario: Edit populates form
- **WHEN** an admin clicks "Edit" on a video row
- **THEN** the modal opens with the form pre-filled from that video's fields
- **AND** shows the current PDF state ("📄 Modul terpasang · N halaman", "Ganti" file input, "Hapus Modul" button) when `pdfPageCount > 0`.

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
The system SHALL serve a `Content-Security-Policy` header that permits `script-src https://www.youtube.com http://www.youtube.com` and `frame-src https://www.youtube.com`.

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

## Added: Resume + PDF Module

Changes from the `video-resume-and-pdf-module` change.

### Requirement: Schema persists per-user video progress
The system SHALL persist per-user playback state for each video in a `VideoProgress` table so that resume works across modal close, page navigation, and re-purchase.

#### Scenario: VideoProgress row shape
- **WHEN** the server creates a `VideoProgress` row
- **THEN** the row stores `userId` (string, matches `User.id`), `videoId` (int, references `Video.id`), `lastSecond` (int ≥ 0, default 0), `watchedSeconds` (int ≥ 0, default 0, monotonically non-decreasing), `completedAt` (nullable timestamp), and `updatedAt` (timestamp auto-updated on write).

#### Scenario: Composite primary key
- **WHEN** a `VideoProgress` row is upserted
- **THEN** the unique key is `(userId, videoId)` so re-saves for the same pair collapse to one row
- **AND** a hard delete of the related `User` cascades to delete the matching progress rows.

#### Scenario: Initial state has no progress
- **WHEN** a user opens a video they have never watched
- **THEN** no `VideoProgress` row exists for `(userId, videoId)`
- **AND** the user list endpoint returns `progress: null` for that video.

### Requirement: Player auto-saves progress
The system SHALL attach a `react-youtube` player with `enablejsapi=1` to the YouTube modal and persist progress events to the server.

#### Scenario: 10-second timer
- **WHEN** the player state is `PLAYING`
- **THEN** a client-side interval reads `getCurrentTime()` every 10 seconds
- **AND** posts `{ videoId, lastSecond, watchedSecondsDelta }` to `PATCH /api/video-progress`.

#### Scenario: Play / pause / seek / ended events
- **WHEN** the player emits a `play`, `pause`, `buffering`, or `ended` state change
- **THEN** the client posts the same payload immediately
- **AND** the post is debounced client-side by 200ms so rapid state changes coalesce.

#### Scenario: Save failure is non-blocking
- **WHEN** the PATCH request fails with a 5xx response
- **THEN** the client retries once
- **AND** if the retry also fails, a non-blocking toast "Progress belum tersimpan" appears
- **AND** playback is not interrupted.

#### Scenario: Save when modal closes
- **WHEN** the user closes the player modal while a video is loaded
- **THEN** the client flushes any pending save synchronously via `navigator.sendBeacon` (fallback `fetch keepalive: true`).

### Requirement: Resume from saved position on open
The system SHALL seek the YouTube player to the saved `lastSecond` when the user opens a video they have progress for.

#### Scenario: First open of a video
- **WHEN** the user opens a video and `progress.lastSecond === 0`
- **THEN** the player starts at 0
- **AND** the resume button label is "▶ Mulai".

#### Scenario: Re-open of a partially-watched video
- **WHEN** the user opens a video and `progress.lastSecond > 0` and `progress.completedAt IS NULL`
- **THEN** the player seeks to `lastSecond` after `onReady` resolves
- **AND** the resume button label is "▶ Lanjut dari m:ss" (formatted from `lastSecond`).

#### Scenario: Re-open of a completed video
- **WHEN** the user opens a video and `progress.completedAt IS NOT NULL`
- **THEN** the player still seeks to `lastSecond` (so the user can re-watch from where they finished if they want)
- **AND** the resume button label is "▶ Tonton Lagi".

#### Scenario: YT API blocked
- **WHEN** `onReady` does not fire within 5 seconds (CSP block, network, or YouTube outage)
- **THEN** the modal shows a fallback "Video tidak dapat diputar" message
- **AND** no progress is written for that open.

### Requirement: CompletedAt set on YouTube ended event
The system SHALL mark a video as completed only when the YouTube `ended` state fires — never on percentage or seek-to-end heuristics.

#### Scenario: Natural end
- **WHEN** the player fires `onStateChange(ENDED)` (state 0)
- **THEN** the client PATCHes `completed: true`
- **AND** the server sets `completedAt = now()`
- **AND** any subsequent `watchedSeconds` updates are still accepted.

#### Scenario: Seek to end is not completion
- **WHEN** the user scrubs the timeline to the last 5 seconds and pauses
- **THEN** `completedAt` is NOT set
- **AND** the card label remains "▶ Lanjut dari m:ss" rather than "▶ Tonton Lagi".

### Requirement: User list includes per-user progress
The `GET /api/videos` response SHALL embed the requesting user's progress for each video so the catalog can render the correct resume label without a second round-trip.

#### Scenario: Response shape
- **WHEN** a user with access calls `GET /api/videos`
- **THEN** each video object includes `progress: { lastSecond, watchedSeconds, completedAt } | null`
- **AND** `progress` is `null` when no `VideoProgress` row exists for `(userId, videoId)`.

#### Scenario: Other users' progress is not exposed
- **WHEN** the response is built
- **THEN** only the calling user's progress is included
- **AND** the `VideoProgress` query is scoped to `userId = session.user.id`.

#### Scenario: Admin caller
- **WHEN** the caller has role `admin`
- **THEN** `progress` is `null` for every video (admins do not get a per-user resume label).

### Requirement: Card resume label is computed from progress
The catalog card SHALL show a context-aware label that derives directly from the `progress` field on the video object.

#### Scenario: No progress
- **WHEN** `progress` is `null` or `lastSecond === 0`
- **THEN** the button label is "▶ Mulai".

#### Scenario: In progress
- **WHEN** `progress` is non-null, `lastSecond > 0`, and `completedAt IS NULL`
- **THEN** the button label is "▶ Lanjut dari m:ss" using the same `formatDuration` helper that already exists for `durationSec`.

#### Scenario: Completed
- **WHEN** `progress.completedAt IS NOT NULL`
- **THEN** the button label is "▶ Tonton Lagi".

### Requirement: Card exposes PDF module when available
The catalog card SHALL show a "📄 Modul" button for any video whose `pdfPageCount > 0`, opening a separate PDF viewer modal.

#### Scenario: Video with PDF
- **WHEN** `video.pdfPageCount > 0`
- **THEN** the card renders a "📄 Modul" button next to the play button
- **AND** clicking it opens a separate modal that paginates the rendered pages.

#### Scenario: Video without PDF
- **WHEN** `video.pdfPageCount IS NULL` or `0`
- **THEN** no "📄 Modul" button is rendered.

#### Scenario: Two modals never co-mount
- **WHEN** the YouTube modal is open
- **THEN** the PDF modal is closed, and vice versa.

### Requirement: Admin can upload a PDF module
The admin video form SHALL accept a single PDF file per video and upload it to the server, which stores the original and renders every page to PNG.

#### Scenario: Upload happy path
- **WHEN** an admin selects a PDF in the form and submits
- **THEN** the client POSTs `multipart/form-data` with the file to `POST /api/admin/videos/[id]/pdf`
- **AND** the server validates `Content-Type: application/pdf` and `size ≤ 20MB`
- **AND** the server uploads the original to Supabase at `uploads/videos/{videoId}/module.pdf` (private path)
- **AND** the server renders every page to PNG and stores them at `pdf-pages/{videoId}/page-N.png`
- **AND** the server sets `Video.pdfUrl = "uploads/videos/{videoId}/module.pdf"` and `Video.pdfPageCount = <rendered count>`.

#### Scenario: Reject wrong mime
- **WHEN** the upload has a non-PDF `Content-Type`
- **THEN** the server returns HTTP 415 with a "Hanya file PDF yang didukung" error.

#### Scenario: Reject oversize
- **WHEN** the upload exceeds 20MB
- **THEN** the server returns HTTP 413 with a "Ukuran file maksimal 20MB" error.

#### Scenario: Reject too many pages
- **WHEN** the PDF has more than 200 pages
- **THEN** the server returns HTTP 413 with a "Modul terlalu besar (maks 200 halaman)" error.

#### Scenario: Partial render failure
- **WHEN** one or more pages fail to render but the rest succeed
- **THEN** the server returns HTTP 422 with a list of failed page numbers
- **AND** the `Video` row's `pdfPageCount` is set to the count of successfully rendered pages
- **AND** the admin form displays a "Sebagian halaman gagal dirender" warning.

#### Scenario: Re-upload supersedes
- **WHEN** an admin uploads a new PDF for a video that already has one
- **THEN** the server deletes the previous `pdf-pages/{videoId}/page-*.png` files first
- **AND** the new render replaces them
- **AND** `Video.pdfUrl` is overwritten.

#### Scenario: Replace with "Hapus Modul"
- **WHEN** an admin clicks a "Hapus Modul" button next to the file input
- **THEN** the client sends `DELETE /api/admin/videos/[id]/pdf`
- **AND** the server deletes all `pdf-pages/{videoId}/page-*.png` files
- **AND** sets `Video.pdfUrl = NULL` and `Video.pdfPageCount = NULL`.

#### Scenario: Admin form displays PDF state
- **WHEN** an admin opens the edit modal for a video that has a PDF
- **THEN** the form shows "📄 Modul terpasang · {pdfPageCount} halaman" with a "Ganti" file input and a "Hapus Modul" button.

### Requirement: PDF page route serves watermarked image
The system SHALL expose a server route that returns a single rendered PDF page as a PNG with a static "Copyright Fix ASN Property" watermark composited on top.

#### Scenario: Request a page
- **WHEN** an authenticated user calls `GET /api/videos/[id]/pdf/page/[n]` with `n` between 1 and `pdfPageCount`
- **THEN** the server verifies the user has video access (same `hasAccess` logic as the catalog)
- **AND** fetches the corresponding `pdf-pages/{videoId}/page-N.png` from Supabase
- **AND** composites a tiled, semi-transparent text overlay reading `Copyright Fix ASN Property` (same overlay for every user)
- **AND** returns the result as `image/png` with `Cache-Control: private, max-age=300`.

#### Scenario: Page out of range
- **WHEN** `n < 1` or `n > pdfPageCount`
- **THEN** the server returns HTTP 404.

#### Scenario: No PDF on video
- **WHEN** the video has `pdfUrl IS NULL`
- **THEN** the server returns HTTP 404.

#### Scenario: Original PDF is not directly accessible
- **WHEN** the user (or any unauthenticated caller) attempts to fetch the original PDF at the Supabase public URL
- **THEN** the request fails with HTTP 403 or 404
- **AND** the only reachable representation of the document is through the per-page watermarked image route.

### Requirement: PDF viewer modal paginates the watermarked pages
The system SHALL provide a separate modal that fetches and renders pages of the PDF, one at a time, with keyboard and click navigation.

#### Scenario: Open viewer
- **WHEN** the user clicks "📄 Modul" on a card
- **THEN** a modal opens at page 1
- **AND** displays `<img src="/api/videos/[id]/pdf/page/1">` plus a "Halaman 1 / N" counter.

#### Scenario: Navigate forward
- **WHEN** the user clicks the right arrow button or presses the right arrow key
- **THEN** the viewer advances to page `n+1` (or stays on the last page).

#### Scenario: Navigate backward
- **WHEN** the user clicks the left arrow button or presses the left arrow key
- **THEN** the viewer goes to page `n-1` (or stays on the first page).

#### Scenario: Image fails to load
- **WHEN** the `<img>` for a page returns a non-2xx response
- **THEN** the modal shows a "Halaman tidak tersedia" placeholder
- **AND** the counter still shows the requested page number.

#### Scenario: Close modal
- **WHEN** the user clicks the close button, presses Escape, or clicks the backdrop
- **THEN** the modal closes
- **AND** the current page index resets to 1 on next open.

### Requirement: Progress persists across access loss
The system SHALL keep `VideoProgress` rows in the database even when the user temporarily loses access, so resume works after re-purchase.

#### Scenario: Access expires
- **WHEN** a user's only qualifying `UserPurchase` is soft-deleted (admin denied, expired, blocked)
- **THEN** the `VideoProgress` rows for that user are NOT deleted
- **AND** the user list endpoint returns `hasAccess: false` regardless of stored progress.

#### Scenario: Re-purchase restores resume
- **WHEN** the same user regains video access via a new or re-activated `UserPurchase`
- **THEN** `GET /api/videos` returns the existing `progress` values
- **AND** the catalog renders the correct "Lanjut dari m:ss" labels without resetting.

