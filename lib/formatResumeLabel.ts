// ─────────────────────────────────────────────
// formatResumeLabel
// Pure function: map a per-user progress object to the button label on
// the video card. Three states, derived directly from `progress`:
//   - null / 0       → "▶ Mulai"
//   - in-progress    → "▶ Lanjut dari m:ss"
//   - completed      → "▶ Tonton Lagi"
// ─────────────────────────────────────────────
import type { VideoProgressSummary } from "@/lib/types";

/** Format seconds as m:ss (same shape as the existing formatDuration). */
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type ResumeLabelKind = "start" | "resume" | "rewatch";

export function formatResumeLabel(
  progress: VideoProgressSummary | null | undefined
): { label: string; kind: ResumeLabelKind } {
  if (!progress || progress.lastSecond <= 0) {
    return { label: "▶ Mulai", kind: "start" };
  }
  if (progress.completedAt) {
    return { label: "▶ Tonton Lagi", kind: "rewatch" };
  }
  return { label: `▶ Lanjut dari ${formatDuration(progress.lastSecond)}`, kind: "resume" };
}
