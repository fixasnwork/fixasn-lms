# Delta: video-pembelajaran — resume + PDF module

## ADDED Requirements

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
The system SHALL expose a server route that returns a single rendered PDF page as a PNG with a user-email watermark composited on top.

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

## MODIFIED Requirements

### Requirement: Mulai opens player modal
The system SHALL open a modal containing a YouTube iframe with `enablejsapi=1` and a state-aware button label driven by the requesting user's progress.

#### Scenario: Resume on open
- **WHEN** the user clicks the resume button (any of "▶ Mulai" / "▶ Lanjut dari m:ss" / "▶ Tonton Lagi")
- **THEN** the page opens a modal containing an `<iframe>` with `src="https://www.youtube.com/embed/{youtubeId}?rel=0&enablejsapi=1"`
- **AND** the embedded player is wrapped by a client component that wires `onReady` / `onStateChange` to the progress save logic.

#### Scenario: Modal close flushes save
- **WHEN** the user closes the player modal
- **THEN** any pending progress save is flushed via `navigator.sendBeacon` (or `fetch keepalive: true` fallback) before the modal unmounts.

### Requirement: Admin page exposes full CRUD
The `/admin/video` page SHALL provide a catalog table, an add modal, an edit modal, a PDF upload control, and a delete action.

#### Scenario: Add modal
- **WHEN** an admin clicks "Tambah Video"
- **THEN** a modal opens with a form for title, description, YouTube URL/id, category (TWK/TIU/TKP), duration (seconds), sort order, a publish toggle, and a PDF file input (optional, can be added after creation).

#### Scenario: Edit populates form
- **WHEN** an admin clicks "Edit" on a video row
- **THEN** the modal opens with the form pre-filled from that video's fields
- **AND** shows the current PDF state ("📄 Modul terpasang · N halaman", "Ganti" file input, "Hapus Modul" button) when `pdfPageCount > 0`.

#### Scenario: Catalog table PDF indicator
- **WHEN** an admin views the catalog table
- **THEN** each row with a PDF shows a "📄 N halaman" indicator in the actions column.
