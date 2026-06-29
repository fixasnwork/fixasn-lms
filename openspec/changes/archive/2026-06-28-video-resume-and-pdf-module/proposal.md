## Why

The current video pembelajaran feature is stateless: every time a user opens a video, playback starts from 0. Long videos (often 30-60 min SKD topic recaps) get abandoned, and the user has to scrub back to where they were. We also lack a way for admins to attach a PDF handout to a video — a near-universal expectation for this kind of catalog. Two changes ship together: per-user resumable playback, and optional per-video PDF module served through a protected, watermarked viewer.

## What Changes

- **Per-user video resume**: new `VideoProgress` table keyed by `(userId, videoId)` stores `lastSecond`, `watchedSeconds`, `completedAt`, `updatedAt`. Client uses `react-youtube` with `enablejsapi=1` to capture playback events; saves are debounced (10s timer + play/pause/seek/ended). Card shows "▶ Lanjut dari m:ss" when progress exists. `completedAt` is set on YouTube's `ended` state only.
- **Optional PDF module per video**: extend `Video` with nullable `pdfUrl` + `pdfPageCount`. Admin uploads via new `VideoForm` field → new `/api/upload-pdf` route (PDF mime only, 20MB, Supabase `uploads` bucket). Server renders every page to PNG at upload time using `pdfjs-dist` and stores in `pdf-pages/{videoId}/page-N.png`. User opens a separate "📄 Modul" modal; pages stream through a new authed + access-gated view route `/api/videos/[id]/pdf/page/[n]` that composites a user-email watermark over the image so the original PDF binary never reaches the client.
- **No breaking changes** to existing catalog data shape, `hasAccess` gate, or YouTube embed behavior for non-purchased users.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `video-pembelajaran`: add resume semantics (per-user progress), add optional PDF module with admin upload + watermarked user viewer. Both gated by the existing `hasAccess` purchase check.

## Impact

- **Schema** (`prisma/schema.prisma`): add `pdfUrl String?` + `pdfPageCount Int?` to `Video`; new `VideoProgress` model with `@@id([userId, videoId])`.
- **API**:
  - New `POST /api/admin/videos/[id]/pdf` (or `/api/upload-pdf`) — admin only, PDF mime + 20MB cap, renders pages, updates `Video` row.
  - New `PATCH /api/video-progress` — authed user, upsert `VideoProgress` for `(userId, videoId)`.
  - New `GET /api/videos/[id]/pdf/page/[n]` — authed user, must have `hasAccess`, returns watermarked PNG.
  - New `GET /api/videos/[id]/progress` — authed user, returns own progress for a video.
  - `GET /api/videos` extended to return progress summary per video (`lastSecond`, `watchedSeconds`, `completedAt`) for the requesting user.
- **UI**:
  - `components/admin/video/VideoForm.tsx` — add file input for PDF, upload progress + replace/remove.
  - `components/admin/video/VideoTable.tsx` — show "📄" indicator for videos with `pdfPageCount > 0`.
  - `app/(user)/video/page.tsx` — card "Lanjut dari m:ss" button label, separate "📄 Modul" button → new modal, progress autosave wired in.
  - New `components/video/VideoProgressTracker.tsx` (client) — wraps `react-youtube` with timer + event handlers, debounced PATCH.
  - New `components/video/PdfViewerModal.tsx` — paginated image viewer, no native PDF chrome.
- **Lib**:
  - `lib/pdfWatermark.ts` — server-side image compositing (overlay user email + timestamp) using `@napi-rs/canvas` or `sharp`.
  - `lib/pdfPageRender.ts` — server-side PDF→PNG via `pdfjs-dist` (Node build).
- **Deps**: `react-youtube`, `pdfjs-dist`, `@napi-rs/canvas` (or `sharp` for overlay). All server-side deps — no client bundle bloat.
- **Storage**: Supabase `uploads` bucket for original PDF (private path under `videos/{id}/module.pdf`); new `pdf-pages/{videoId}/page-N.png` paths (public-readable as static images, but only reached via the authed view route).
- **Tests**: Vitest cases for progress PATCH route (auth, dedupe, access-gate), PDF view route (auth, access-gate, watermark compositing unit test, page-not-found), admin upload route (mime/size validation, page rendering, model update), resume card label logic.
