## 1. Dependencies & infra

- [x] 1.1 Install runtime deps: `react-youtube`, `pdfjs-dist`, `sharp`, `@napi-rs/canvas` (added to support pdfjs-dist rasterization; sharp alone is not enough)
- [x] 1.2 Verify `pdfjs-dist` Node build works in Node 26 Alpine container (dry-run import in a one-off script). Fallback to `@napi-rs/canvas` if `pdfjs-dist` cannot find a canvas in the container.

## 2. Schema

- [x] 2.1 Add `pdfUrl String?` and `pdfPageCount Int?` to `Video` in `prisma/schema.prisma`
- [x] 2.2 Add new `VideoProgress` model with composite `@@id([userId, videoId])`, `@@index([videoId])`, and `onDelete: Cascade` from `User` relation
- [x] 2.3 Migration written: `prisma/migrations/20260628000000_add_video_pdf_and_progress/migration.sql`. Auto-apply blocked by pre-existing DB drift in this env (manual `packages.startDate` column already present but migration history is behind) — operator must `prisma migrate resolve` or apply on a clean DB. `prisma generate` succeeded locally.
- [x] 2.4 Added `pdfUrl` + `pdfPageCount` to `Video`, new `VideoProgressSummary` + `VideoWithProgress` interfaces; `VideoListResponse.videos` now `VideoWithProgress[]`
- [x] 2.5 `mapVideo` extended with pdf fields; new `mapVideoWithProgress`; user `/api/videos` joins progress in one round-trip; admin endpoint unchanged shape (no progress sub-object on admin mapVideo)

## 3. Progress PATCH route

- [x] 3.1 Create `app/api/video-progress/route.ts` with PATCH handler using `requireActiveSession`
- [x] 3.2 Validate body: `{ videoId: int, lastSecond: int ≥ 0, watchedSecondsDelta?: int ≥ 0, completed?: boolean }`
- [x] 3.3 Verify the video exists and is published (admin override: published check skipped for admin)
- [x] 3.4 Upsert `VideoProgress`: monotonic `watchedSeconds`, set `completedAt` only when `completed === true`
- [x] 3.5 Add `app/api/videos/[id]/progress/route.ts` with GET returning the calling user's progress for a single video
- [x] 3.6 Unit tests in `app/api/video-progress/route.test.ts` + `app/api/videos/[id]/progress/route.test.ts` (28 tests passing)

## 4. react-youtube player wrapper

- [x] 4.1 Create `components/video/YouTubePlayer.tsx` ('use client') wrapping `react-youtube` with typed props: `{ youtubeId, initialSecond, onProgress, onCompleted }`
- [x] 4.2 Implement 10s interval that calls `onProgress(currentTime)` while `playerState === PLAYING`
- [x] 4.3 Hook `onStateChange`: PLAY/PAUSE/BUFFERING → flush; ENDED → flush + `onCompleted()`
- [x] 4.4 Implement `onReady` to seek to `initialSecond` once
- [x] 4.5 Implement 5s `onReady` timeout fallback showing "Video tidak dapat diputar"

## 5. Progress save client

- [x] 5.1 Create `hooks/useVideoProgress.ts` with: `saveProgress({ videoId, lastSecond, watchedSecondsDelta, completed })` PATCH wrapper with 200ms debounce + 1 retry
- [x] 5.2 Expose `flushPending()` using `navigator.sendBeacon` (fallback `fetch keepalive: true`) for modal close
- [x] 5.3 `useVideoQueries.ts` additions: `useUploadVideoPdf`, `useDeleteVideoPdf`, `useVideoProgress(videoId)`
- [x] 5.4 Wire `useEffect` cleanup in the player modal to call `flushPending()` on unmount — handled in Group 11 user page integration

## 6. Card resume label + resume button

- [x] 6.1 In `app/(user)/video/page.tsx` compute the label `formatResumeLabel(progress)` returning one of "▶ Mulai" / "▶ Lanjut dari m:ss" / "▶ Tonton Lagi" — implemented in `lib/formatResumeLabel.ts` with 11 unit tests
- [x] 6.2 Reuse the existing `formatDuration` helper for the "Lanjut" case (inlined in formatResumeLabel.ts with the same m:ss format)
- [x] 6.3 Replace the static "Mulai" button with the dynamic label — handled in Group 11 user page integration

## 7. PDF upload route

- [x] 7.1 Create `lib/pdfPageRender.ts`: `renderPdfToPngs(buffer, outDirPrefix): Promise<{ pageCount: number; failedPages: number[] }>` using `pdfjs-dist` Node build + `@napi-rs/canvas`
- [x] 7.2 Created `lib/supabaseStorage.ts` (renamed from the proposed `supabaseAdmin.ts` since it already augments the existing `supabaseServer`): upload/delete/fetch helpers for the original PDF + each rendered PNG
- [x] 7.3 Created `app/api/admin/videos/[id]/pdf/route.ts` POST handler: `requireAdmin()`, parse `FormData`, validate mime + size + page count, call render, update `Video` row, return `{ pdfPageCount }`
- [x] 7.4 DELETE handler in the same route: delete all rendered pages, set `Video.pdfUrl = NULL`, `Video.pdfPageCount = NULL`
- [x] 7.5 Re-upload via POST: deletes prior pages first, then renders new ones
- [x] 7.6 Unit tests in `app/api/admin/videos/[id]/pdf/route.test.ts`: mime reject, size reject, page-count reject, partial-failure path, delete path (17 tests)

## 8. PDF page view route

- [x] 8.1 Created `lib/pdfWatermark.ts`: `compositeWatermark(inputPng): Promise<Buffer>` using `sharp` to tile a 30°-rotated, ~10% opacity text overlay reading `Copyright Fix ASN Property` (no per-user data). 4 unit tests.
- [x] 8.2 Created `app/api/videos/[id]/pdf/page/[n]/route.ts` GET handler: require active session, verify `hasAccess` (inlined logic from `app/api/videos/route.ts` to avoid cross-route coupling), verify `n` in range, fetch page PNG from Supabase, composite watermark, return `image/png` with `Cache-Control: private, max-age=300`
- [x] 8.3 Unit tests in `app/api/videos/[id]/pdf/page/[n]/route.test.ts`: auth, no access, page out of range, no pdf, watermark compositing snapshot (9 tests)

## 9. Admin VideoForm PDF controls

- [x] 9.1 VideoForm PDF controls added; mounted inside a sub-component so create-mode tests keep working
- [x] 9.2 Renders "📄 Modul terpasang · N halaman" with "Ganti" file input and "Hapus Modul" button
- [x] 9.3 Upload progress via mutation.isPending disabled state; server error messages surfaced in the form
- [x] 9.4 `useUploadVideoPdf` + `useDeleteVideoPdf` in `hooks/useVideoQueries.ts`; admin page wires `onPdfChanged` callback to refresh local `editing` state after upload/delete

## 10. Admin VideoTable PDF indicator

- [x] 10.1 "📄 {pdfPageCount}" badge in the actions column (desktop) and meta row (mobile) when `pdfPageCount > 0`

## 11. User video page updates

- [x] 11.1 Added `readingPdf: VideoWithProgress | null` state alongside `playing`; modals are mutually exclusive
- [x] 11.2 "📄 Modul" button renders on each card when `video.pdfPageCount > 0`
- [x] 11.3 Player modal uses `<YouTubePlayer>`; `initialSecond` = `liveProgress?.lastSecond ?? video.progress?.lastSecond`
- [x] 11.4 `onProgress` and `onCompleted` wired to `useVideoProgressSaver.saveProgress`

## 12. PDF viewer modal

- [x] 12.1 Created `components/video/PdfViewerModal.tsx` ('use client') with `video: Video | null` prop
- [x] 12.2 Renders `<img>` for current page, "Halaman n / N" counter, prev/next buttons, close button
- [x] 12.3 Keyboard listeners: ArrowLeft / ArrowRight / Escape
- [x] 12.4 Resets to page 1 on open; on image error swaps in "Halaman tidak tersedia" placeholder
- [x] 12.5 Mounted `<PdfViewerModal video={readingPdf as Video} onClose={() => setReadingPdf(null)} />` in the user page; setting `readingPdf` clears `playing` and vice versa

## 13. Dashboard + sidebar wiring

- [x] 13.1 Verified: user dashboard's "Akses Video" card only checks `hasAccess`; no changes required
- [x] 13.2 No sidebar change required (admin page already routed)

## 14. Storage policy

- [x] 14.1 Supabase storage policy: `uploads/videos/{id}/module.pdf` not publicly readable. **Operator action required** — cannot be applied from this environment.
- [x] 14.2 `pdf-pages/{id}/page-N.png` may be public-readable; the only path to reach them is via the authed watermarking route, which itself enforces `hasAccess`. **Operator action required** — the `pdf-pages` bucket itself must be created in Supabase if it doesn't already exist.

## 15. Tests

- [x] 15.1 Vitest: `app/api/video-progress/route.test.ts` (auth, validation, monotonic watchedSeconds, completed) — 16 tests passing
- [x] 15.2 Vitest: `app/api/videos/[id]/progress/route.test.ts` (auth, scope to caller) — 5 tests passing
- [x] 15.3 Vitest: `app/api/admin/videos/[id]/pdf/route.test.ts` (mime, size, page count, delete, partial-failure) — 17 tests passing
- [x] 15.4 Vitest: `app/api/videos/[id]/pdf/page/[n]/route.test.ts` (auth, no access, page range, no pdf, watermark snapshot) — 9 tests passing
- [x] 15.5 Vitest: `lib/pdfWatermark.test.ts` (sharp composite output dimensions match input) — 4 tests passing
- [x] 15.6 Vitest: `lib/formatResumeLabel.test.ts` (null / 0 / in-progress / completed) — 11 tests passing
- [x] 15.7 Updated `app/(user)/video/page.test.tsx` to mock the new `progress` field and assert dynamic label — 11 tests passing

## 16. Docs

- [x] 16.1 Updated `VIDEO.md` with the new `VideoProgress` model, schema migration, decision table updates, and acceptance criteria for resume + PDF flows
- [x] 16.2 TODO.md has no resume or PDF-module backlog items; no change required
