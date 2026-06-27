// ─────────────────────────────────────────────
// YouTube id extraction (server-side helper)
// Accepts full watch / short / embed / shorts / mobile URLs as well as a
// raw 11-char id. Returns the normalized 11-char id or null when the input
// is empty, malformed, or has an unrecognized host. This is a defense-in-
// depth re-parse — clients should also pre-validate before POST.
// ─────────────────────────────────────────────

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_SHORT_RE = /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})/;
const YT_PATH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/;
const YT_WATCH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/;

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
