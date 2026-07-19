"use client";

// ─────────────────────────────────────────────
// PdfViewerModal
// Paginated image viewer for the rendered PDF pages. The original PDF
// binary is never loaded here — every page is fetched from the watermarked
// image route.
//
// Zoom model (Option A from the design discussion):
//   - Pages are pre-rendered at RENDER_SCALE = 2.5x so the native
//     resolution is already high.
//   - The user zooms via a CSS `transform: scale()` on the <img>. This
//     is instant and does not require re-fetching the image.
//   - The modal container scrolls both axes; the user can also
//     pinch-zoom on touch devices via the browser's default handling
//     of `<img>` overflow.
//
// Keyboard: ArrowLeft / ArrowRight page, +/- zoom, 0 reset.
// ─────────────────────────────────────────────
import { useEffect, useState } from "react";
import { Modal, Button } from "@/components/ui";
import type { Video } from "@/lib/types";

export interface PdfViewerModalProps {
  video: Video | null;
  onClose: () => void;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;

export default function PdfViewerModal({
  video,
  onClose,
}: PdfViewerModalProps) {
  if (!video) return null;
  const total = video.pdfPageCount ?? 0;
  if (total <= 0) {
    return (
      <Modal open onClose={onClose} title="Modul PDF" width={640}>
        <div className="text-sm text-gray-600 text-center py-8">
          Modul tidak tersedia.
        </div>
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title={`Modul ${video.title}`} width={720}>
      {/* key=video.id forces remount → resets page + zoom + imgFailed */}
      <PdfViewerBody key={video.id} video={video} onClose={onClose} />
    </Modal>
  );
}

function PdfViewerBody({
  video,
  onClose,
}: {
  video: Video;
  onClose: () => void;
}) {
  const [page, setPage] = useState<number>(1);
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const total = video.pdfPageCount ?? 1;

  // Keyboard navigation + zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore key shortcuts while the user is typing in an input.
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPage((p) => Math.min(total, p + 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clampZoom(z - ZOOM_STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, total]);

  const pageSrc = `/api/videos/${video.id}/pdf/page/${page}`;

  return (
    <div data-testid="pdf-viewer-modal" className="flex flex-col gap-3">
      {/* ── Toolbar ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
        <span data-testid="pdf-viewer-counter" className="font-semibold">
          Halaman {page} / {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
            data-testid="pdf-viewer-zoom-out"
          >
            −
          </Button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[3.5rem] text-center px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-xs font-semibold"
            aria-label="Reset zoom"
            data-testid="pdf-viewer-zoom-reset"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
            data-testid="pdf-viewer-zoom-in"
          >
            +
          </Button>
        </div>
        <span className="text-gray-400 hidden sm:inline">
          ← → halaman · + − zoom · 0 reset
        </span>
      </div>

      {/* ── Page area ────────────────────────────── */}
      {/*
        The scrollable viewport has a fixed height so `overflow: auto`
        can show scrollbars when the zoomed image overflows. The
        image's layout box is sized to `width: ${zoom * 100}%` so
        the browser can scroll to every pixel of the zoomed image.
        `height: auto` on the image preserves the aspect ratio so
        the Y axis grows proportionally with X.

        Layout:
          - Outer wrapper: a plain block container with a defined
            `h-[70vh]` and `overflow-auto`. We deliberately do NOT
            use `display: flex` here — a flex parent with a
            single item that has `width: %` does not establish a
            reliable vertical scroll context (the cross-axis
            overflow handling is browser-dependent when
            `align-items: flex-start` is in play).
          - Image: a `block` element with `margin: 0 auto` for
            horizontal centering. When the image is wider than the
            container (zoom > 1), `margin: 0 auto` computes
            negative margins, which centers the overflow so the
            user can scroll to see both edges.
      */}
      <div
        className="bg-gray-100 rounded-xl overflow-auto h-[70vh]"
        data-testid="pdf-viewer-scroll"
      >
        {imgFailed ? (
          <div
            data-testid="pdf-viewer-placeholder"
            className="text-center py-12 text-sm text-gray-500"
          >
            Halaman tidak tersedia
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${video.id}-${page}-${zoom}`}
            src={pageSrc}
            alt={`Halaman ${page}`}
            onError={() => setImgFailed(true)}
            onLoad={() => setImgFailed(false)}
            className="block mx-auto"
            style={{
              width: `${zoom * 100}%`,
              height: "auto",
              maxWidth: "none",
              // Subtle transition between zoom steps; instant on first
              // paint so the modal doesn't open with a delayed render.
              transition: imgFailed ? undefined : "width 100ms ease-out",
            }}
            data-testid="pdf-viewer-image"
          />
        )}
      </div>

      {/* ── Prev / Next controls ─────────────────── */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          data-testid="pdf-viewer-prev"
        >
          ← Sebelumnya
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={page >= total}
          data-testid="pdf-viewer-next"
        >
          Berikutnya →
        </Button>
      </div>
    </div>
  );
}

function clampZoom(z: number): number {
  if (z < ZOOM_MIN) return ZOOM_MIN;
  if (z > ZOOM_MAX) return ZOOM_MAX;
  return Math.round(z * 100) / 100;
}
