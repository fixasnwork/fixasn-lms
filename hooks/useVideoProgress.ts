"use client";

// ─────────────────────────────────────────────
// useVideoProgress
// Client-side wrapper around PATCH /api/video-progress. Coalesces rapid
// state changes (200ms debounce), retries once on 5xx, and exposes a
// flushPending() helper that the modal calls on close — using
// navigator.sendBeacon when available, falling back to fetch keepalive.
// ─────────────────────────────────────────────
import { useCallback, useEffect, useRef } from "react";

export interface SaveProgressInput {
  videoId: number;
  lastSecond: number;
  watchedSecondsDelta?: number;
  completed?: boolean;
}

interface PendingPayload {
  videoId: number;
  lastSecond: number;
  watchedSecondsDelta: number;
  completed: boolean;
}

const DEBOUNCE_MS = 200;

export function useVideoProgress() {
  // Latest-pending payload: takes the maximum lastSecond + the sum of
  // any deltas + OR of completed, so a burst of save calls coalesces
  // into a single meaningful PATCH.
  const pendingRef = useRef<PendingPayload | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);

  const flushNow = useCallback(async (): Promise<void> => {
    const payload = pendingRef.current;
    if (!payload) return;
    pendingRef.current = null;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (inFlightRef.current) return; // a previous flush is still running
    inFlightRef.current = true;
    try {
      // First attempt
      const res = await fetch("/api/video-progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (res.status >= 500) {
        // One retry on 5xx. We do NOT retry on 4xx — those are validation
        // errors we can't recover from by trying again.
        await fetch("/api/video-progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch {
      // Best-effort: swallow network errors. The next save will overwrite.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const scheduleFlush = useCallback((): void => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void flushNow();
    }, DEBOUNCE_MS);
  }, [flushNow]);

  const saveProgress = useCallback(
    (input: SaveProgressInput): void => {
      const incoming: PendingPayload = {
        videoId: input.videoId,
        lastSecond: Math.max(0, Math.floor(input.lastSecond)),
        watchedSecondsDelta: Math.max(0, Math.floor(input.watchedSecondsDelta ?? 0)),
        completed: input.completed === true,
      };
      const prev = pendingRef.current;
      if (prev && prev.videoId === incoming.videoId) {
        pendingRef.current = {
          videoId: incoming.videoId,
          lastSecond: Math.max(prev.lastSecond, incoming.lastSecond),
          watchedSecondsDelta: prev.watchedSecondsDelta + incoming.watchedSecondsDelta,
          completed: prev.completed || incoming.completed,
        };
      } else {
        pendingRef.current = incoming;
      }
      scheduleFlush();
    },
    [scheduleFlush]
  );

  // Used by the modal on close. Prefers sendBeacon (works during page
  // unload); falls back to fetch keepalive.
  const flushPending = useCallback((): void => {
    const payload = pendingRef.current;
    if (!payload) return;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        const ok = navigator.sendBeacon("/api/video-progress", blob);
        if (ok) {
          pendingRef.current = null;
          return;
        }
      } catch {
        // fall through to fetch
      }
    }
    if (typeof fetch !== "undefined") {
      try {
        fetch("/api/video-progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        pendingRef.current = null;
      } catch {
        // best-effort; the user is closing anyway
      }
    }
  }, []);

  // Mount-time cleanup: if the component unmounts while a save is
  // pending, we cannot sendBeacon from here reliably — the parent's
  // modal effect is responsible for calling flushPending().
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return { saveProgress, flushPending };
}
