## Context

Current `video-pembelajaran` is a stateless YouTube embed catalog. `Video` is a CRUD model with no per-user state and no attachment. The user route (`app/(user)/video/page.tsx`) opens a modal with `<iframe src="https://www.youtube.com/embed/{id}?rel=0">` — no `enablejsapi`, no time polling, no persistence. The admin route (`app/admin/video/page.tsx`) has a 4-field `VideoForm` (title, description, youtube, category, duration, sort, isPublished) with no upload field. Server endpoints live under `app/api/admin/videos/*` and `app/api/videos/*`; `useVideoQueries.ts` exposes TanStack hooks for both sides.

The feature needs two additive capabilities that share the same data surface (videos) and access model (purchased-package gate). This design captures the cross-cutting decisions, especially around the YouTube player upgrade and the PDF anti-extraction pipeline.

## Goals / Non-Goals

**Goals:**
- Per-user playback resume that survives modal close, page navigation, and re-purchase.
- Optional per-video PDF module with admin upload, page-render on the server, and a viewer that prevents the original PDF binary from reaching the client.
- Zero breaking change to existing API response shapes (additive fields only).
- Server-side enforcement of access control on every new route.

**Non-Goals:**
- Per-user watch-time analytics dashboards (raw `watchedSeconds` is stored but no aggregation UI ships).
- Inline scrubbing thumbnails / storyboard previews.
- Per-page analytics inside the PDF.
- DRM-grade copy protection (forensic watermark only; screenshots and re-typing remain possible).
- Multi-language watermarks.

## Decisions

### D1. `react-youtube` over vanilla IFrame API
- **Rationale**: typed player ref, `onStateChange` + `onPlaybackRateChange` cover all our event needs; ~30KB; maintained.
- **Alternative considered**: vanilla `YT.Player` constructor in a `useEffect`. Slightly leaner, but loses React lifecycle ergonomics for the modal-open and re-mount-on-edit flows. Not worth the custom hook code.
- **API contract**: pass `onReady` to seek the player to `progress.lastSecond` and capture `onStateChange` for play/pause/buffering/ended + an interval timer reading `player.getCurrentTime()` every 10s.

### D2. `pdfjs-dist` (Node build) for upload-time rendering
- **Rationale**: same parser used by Firefox; renders to a `Canvas` (we substitute `@napi-rs/canvas` in Node because browser Canvas is unavailable server-side); no system binary required.
- **Alternative considered**: serverless puppeteer/chromium (heavy ~100MB, slow cold start, breaks Docker image size target). Rejected.
- **Alternative considered**: `pdftoppm` CLI via poppler (not available in Node 26 Alpine container). Rejected.
- **Failure mode**: if a page fails to render, log + skip the page, set `Video.pdfPageCount` to the count of successfully rendered pages, and return 422 from the upload route with details. The video remains usable without PDF.

### D3. `sharp` for the per-request watermark overlay
- **Rationale**: `sharp` is already implicitly supported in many image pipelines, has a small footprint, and `composite([{ input: overlayPng, gravity: 'center' }])` is one line. `@napi-rs/canvas` would also work but `sharp` is more battle-tested for image pipelines and is what `next/image` uses under the hood — adding `@napi-rs/canvas` introduces a second native binding.
- **Pre-render strategy**: the overlay text is the static string `Copyright Fix ASN Property`, rendered once into a tiled, semi-transparent SVG, rasterized with `sharp`, and composited over each fetched page PNG. Because the watermark is identical for every request, the same composited output can be cached at the CDN/edge indefinitely (we still set `Cache-Control: private, max-age=300` as a baseline).
- **Original PDF never reachable**: the storage path is `uploads/videos/{videoId}/module.pdf` with a Supabase RLS or signed-URL-only policy. The user route returns watermarked PNGs only.

### D4. `VideoProgress` keyed by composite `(userId, videoId)` instead of one row per user
- **Rationale**: a user watches a finite catalog. One row per video per user means an upsert on every save and a hard cap on table growth. Matches the model's primary access pattern (load progress for a given video, or load all progress for the user).
- **Index**: `@@index([userId, videoId])` (covered by the PK), and `@@index([videoId])` for future per-video aggregate queries.
- **`watchedSeconds` is monotonic**: stored value is `max(current, lastSecond - 0)` plus timer increment. Never decreases. This makes the field safe to show on the card as "X min watched".

### D5. Progress save strategy: 10s timer + events, debounced server-side
- **Client side**: `setInterval` reads `getCurrentTime()` every 10s while `playerState === PLAYING`; also fires on `pause`, `seek`, `buffering`, `ended`.
- **Server side**: a `POST /api/video-progress` upsert accepts `{ videoId, lastSecond, watchedSecondsDelta?, completed? }`. A simple in-memory debounce on the client (200ms) coalesces rapid state changes.
- **Failure mode**: client retries once on 5xx; on permanent failure, surface a non-blocking toast "Progress belum tersimpan" but don't interrupt playback.

### D6. Schema change is additive only
- `Video.pdfUrl` and `Video.pdfPageCount` are `nullable`; existing rows remain valid. No defaults, no backfill.
- New `VideoProgress` table — no rows until a user plays a video; safe to ship without migration scripts beyond `prisma migrate dev`.

### D7. `useUserVideos` extended (not replaced) to include progress
- Response shape adds `progress: { lastSecond, watchedSeconds, completedAt } | null` per video.
- Same `staleTime: 60_000` (catalog TTL), but the progress sub-object is refetched via the new `GET /api/videos/[id]/progress` endpoint when the user opens the player modal — guaranteeing fresh data.
- The card label "▶ Lanjut dari m:ss" reads from this object.

### D8. PDF viewer is a separate modal, not embedded in the YouTube modal
- Two `useState<Video | null>` slots: `playing` (YouTube) and `readingPdf` (PDF). Modals never co-mount.
- `PdfViewerModal` is paginated; left/right arrow keys + click-paginate; page counter at top; close on backdrop or Esc.
- All images come from `/api/videos/[id]/pdf/page/[n]`; failures fall back to a "Halaman tidak tersedia" placeholder.

## Risks / Trade-offs

- **Cold-start latency for PDF first-view** → pre-rendered PNGs are served as static assets from Supabase; the watermark composite is the only per-request cost (~30-80ms on a warm container). Acceptable.
- **Storage growth for PDF pages** → a 50-page PDF at ~200KB/page is 10MB/video. Acceptable for a curated catalog. Long-term: add a janitor to delete page PNGs when a PDF is replaced or the video is hard-deleted.
- **YouTube API block on iframes** → if a YouTube embed is blocked (CSP, network), the player ref will fail to load; the modal must catch this in `onError` and show a "Video tidak dapat diputar" fallback. Progress tracking is gated on `onReady` succeeding, so no spurious writes.
- **Watermark is brand attribution only** → screenshots and re-typing still leak content. We document this as a non-goal; the watermark makes casual sharing clearly attributable, not tamper-proof.
- **`react-youtube` SSR** → component is rendered inside a `'use client'` modal; safe. No server bundle bloat.
- **PDF page render OOM on huge files** → cap at 200 pages server-side; if exceeded, reject with 413 and a "Modul terlalu besar" error in the admin form.
- **Migration risk** → schema change is purely additive (nullable columns, new table); no destructive operations. `prisma migrate dev` is sufficient; no data backfill required.
- **Idempotent upload** → if admin re-uploads a PDF for the same video, the old `pdf-pages/{videoId}/page-*.png` are deleted first; the new render supersedes. Covered by a single transactional function in the upload route.

## Migration Plan

1. `prisma migrate dev --name add_video_pdf_and_progress` to apply schema.
2. Deploy — no env changes, no data backfill.
3. Feature-flag the new admin "Upload Modul" field and the user "📄 Modul" button behind `process.env.NEXT_PUBLIC_VIDEOPDF_ENABLED` for 24h of monitoring in production. (Optional, easy to remove if not desired.)
4. Rollback: `prisma migrate resolve --rolled-back` on the migration; the nullable columns + empty `VideoProgress` table leave no traces.

## Decisions (implementation changes from design)

These decisions emerged during implementation and are refinements on top of the original design.

### I1. `pdf-to-img` wrapper instead of raw `pdfjs-dist` + custom `NodeCanvasFactory`
- **Rationale**: The custom `NodeCanvasFactory` in `lib/pdfPageRender.ts` duplicated pdfjs-dist's built-in factory and was silently ignored (pdfjs-dist reads `CanvasFactory` with capital C). The `pdf-to-img` package (MIT, 237K weekly DLs) bakes in the correct Node setup (standardFontDataUrl, cMapUrl, canvasFactory injection) and reduced our glue code from 146 lines to 75.
- **Dependency added**: `pdf-to-img@^6.2.0` (transitively pins `pdfjs-dist@5.6.205` — one version below the direct dep, but rendering semantics are identical for our use case).

### I2. `@napi-rs/canvas` is a required dependency, not optional
- **Why**: pdfjs-dist 6.x's built-in `NodeCanvasFactory` uses `require("@napi-rs/canvas")` internally. Without it, pdfjs-dist builds an empty canvas and all pages render as blank. It ships prebuilt `linux-x64-musl` binaries for Alpine.
- **Listed in**: `package.json`, externalized in `next.config.ts` via `serverExternalPackages`.

### I3. Progress GET endpoint returns 200 with `progress: null` instead of 404
- **Why**: The original implementation returned 404 for "no progress row exists", which appeared as an error in DevTools even though the client handled it. Changed to `200 { progress: null }` — the "no progress yet" case is not an error state.
- **Contract**: Client hook simplified; 404 special case removed.

### I4. CSP must allow both `http://` and `https://` YouTube scripts
- **Why**: `youtube-player`'s `loadYouTubeIframeApi` script URL matches the page's protocol (`window.location.protocol === 'http:' ? 'http:' : 'https:'`). Dev runs on `http://localhost`, so the script loads from `http://www.youtube.com/iframe_api`. CSP `script-src` must list both schemes.
- **CSP**: `script-src 'self' ... https://www.youtube.com http://www.youtube.com`.

### I5. Zoom is implemented via `width: %` on a `block mx-auto` image, not CSS transform
- **Why**: `transform: scale()` does not change the layout box — the visual content extending past the layout box is clipped by `overflow: auto` and unreachable by scrolling. Sizing the image's `width` directly (as a percentage of the scroll container) makes the layout match the visual, so `overflow: auto` in both axes scrolls correctly.
- **Viewer**: The scroll container is a plain block div with `h-[70vh] overflow-auto`. The image is `block mx-auto` with `width: ${zoom * 100}%` and `height: auto`. Flex layout was avoided because `align-items: flex-start` in a flex parent prevents cross-axis (vertical) overflow from triggering a scrollbar in some browsers.

### I6. Watermark is a static string, not per-user forensic
- **Why**: The user chose "Copyright Fix ASN Property" over per-user email/timestamp. The overlay is identical for every request and composited via `sharp` SVG overlay at 10% opacity, 30° rotation, tiled evenly.
- **Cache**: `Cache-Control: private, max-age=300` (static overlay means the same cached response works for all users within 5 minutes).

## Open Questions

(none — all resolved)
