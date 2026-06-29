import { describe, it, expect } from "vitest";
import { formatResumeLabel, formatDuration } from "./formatResumeLabel";

describe("formatDuration", () => {
  it("formats 0 as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
  it("pads seconds under 10", () => {
    expect(formatDuration(65)).toBe("1:05");
  });
  it("handles hours", () => {
    expect(formatDuration(3725)).toBe("62:05");
  });
  it("coerces negative to 0", () => {
    expect(formatDuration(-3)).toBe("0:00");
  });
  it("floors fractional seconds", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });
});

describe("formatResumeLabel", () => {
  it("returns '▶ Mulai' when progress is null", () => {
    const r = formatResumeLabel(null);
    expect(r.label).toBe("▶ Mulai");
    expect(r.kind).toBe("start");
  });

  it("returns '▶ Mulai' when progress is undefined", () => {
    const r = formatResumeLabel(undefined);
    expect(r.label).toBe("▶ Mulai");
    expect(r.kind).toBe("start");
  });

  it("returns '▶ Mulai' when lastSecond is 0", () => {
    const r = formatResumeLabel({ lastSecond: 0, watchedSeconds: 0, completedAt: null });
    expect(r.label).toBe("▶ Mulai");
    expect(r.kind).toBe("start");
  });

  it("returns '▶ Lanjut dari m:ss' when in-progress", () => {
    const r = formatResumeLabel({ lastSecond: 75, watchedSeconds: 80, completedAt: null });
    expect(r.label).toBe("▶ Lanjut dari 1:15");
    expect(r.kind).toBe("resume");
  });

  it("returns '▶ Tonton Lagi' when completedAt is set", () => {
    const r = formatResumeLabel({
      lastSecond: 600,
      watchedSeconds: 600,
      completedAt: "2026-06-15T10:00:00.000Z",
    });
    expect(r.label).toBe("▶ Tonton Lagi");
    expect(r.kind).toBe("rewatch");
  });

  it("treats lastSecond <= 0 as start, even if completedAt is set (defensive)", () => {
    const r = formatResumeLabel({
      lastSecond: 0,
      watchedSeconds: 0,
      completedAt: "2026-06-15T10:00:00.000Z",
    });
    // Per spec: "null or lastSecond === 0" → Mulai wins (no resume position).
    expect(r.label).toBe("▶ Mulai");
    expect(r.kind).toBe("start");
  });
});
