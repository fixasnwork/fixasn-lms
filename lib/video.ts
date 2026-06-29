// ─────────────────────────────────────────────
// YouTube id extraction + shared video helpers.
//   parseYouTubeId   — extract 11-char id from URL or raw id
//   mapVideo         — Prisma row → Video type
//   ALLOWED_VIDEO_CATEGORIES — valid Video.category values
// ─────────────────────────────────────────────

import type {
  AdminVideoWithProgress,
  PublicVideo,
  Video,
  VideoCategory,
  VideoProgressSummary,
  VideoWithProgress,
} from "@/lib/types";

export const ALLOWED_VIDEO_CATEGORIES: ReadonlyArray<VideoCategory> = ["TWK", "TIU", "TKP"];

/** Shared mapper: Prisma video row → admin API response shape (includes `pdfUrl`). */
export function mapVideo(v: {
  id: number;
  title: string;
  description: string | null;
  youtubeId: string;
  category: string;
  durationSec: number | null;
  sortOrder: number;
  isPublished: boolean;
  pdfUrl: string | null;
  pdfPageCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}): Video {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    youtubeId: v.youtubeId,
    category: v.category as VideoCategory,
    durationSec: v.durationSec,
    sortOrder: v.sortOrder,
    isPublished: v.isPublished,
    pdfUrl: v.pdfUrl,
    pdfPageCount: v.pdfPageCount,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

/**
 * User-facing mapper: Prisma video row → public API response shape.
 * Deliberately omits `pdfUrl` so the original PDF's storage path is
 * never returned to a non-admin caller. The PDF anti-extraction
 * pipeline requires that the storage path remains secret; if it leaks,
 * an unauthenticated request to the public Supabase bucket can
 * download the un-watermarked original.
 */
export function mapPublicVideo(v: Parameters<typeof mapVideo>[0]): PublicVideo {
  const { pdfUrl: _omit, ...rest } = mapVideo(v);
  return rest;
}

/** Admin mapper: attach the requesting user's per-video progress to a video. */
export function mapVideoWithProgress(
  v: Parameters<typeof mapVideo>[0],
  progress: VideoProgressSummary | null
): AdminVideoWithProgress {
  return { ...mapVideo(v), progress };
}

/** User mapper: attach progress to a public video (omits `pdfUrl`). */
export function mapPublicVideoWithProgress(
  v: Parameters<typeof mapVideo>[0],
  progress: VideoProgressSummary | null
): VideoWithProgress {
  return { ...mapPublicVideo(v), progress };
}

// All URL regexes are end-anchored with `(?=$|[?&#/])` so an id longer
// than 11 chars (e.g. an accidental paste of 12+ chars after `v=`) is
// rejected instead of silently truncated to its first 11 characters.

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_SHORT_RE = /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?=$|[?&#/])/;
const YT_PATH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})(?=$|[?&#/])/;
// Watch URLs: terminator uses a lookahead so the character is not consumed.
// Set matches the other three regexes: #, &, or end-of-string. `?` is excluded
// because v= is the only `?` separator; `v=...&...&...` is captured by the
// (?:.*&)? prefix, so the next `?` would be a new query we want to reject.
const YT_WATCH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})(?=$|[&#])/;

export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw 11-char id passthrough.
  if (YT_ID_RE.test(trimmed)) return trimmed;

  const short = trimmed.match(YT_SHORT_RE);
  if (short) return short[1];

  const path = trimmed.match(YT_PATH_RE);
  if (path) return path[1];

  const watch = trimmed.match(YT_WATCH_RE);
  if (watch) return watch[1];

  return null;
}
