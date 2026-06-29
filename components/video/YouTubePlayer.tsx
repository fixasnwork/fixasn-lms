"use client";

// ─────────────────────────────────────────────
// YouTubePlayer
// Thin wrapper around `react-youtube` that:
//   • passes `enablejsapi=1` so the host iframe is scriptable
//   • seeks to `initialSecond` once the player is ready
//   • polls `getCurrentTime()` every 10s while playing
//   • calls onProgress / onCompleted at the right hooks
//   • falls back to "Video tidak dapat diputar" if `onReady` never fires
//     within 5 seconds (CSP block, network, or YouTube outage)
// ─────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";

/**
 * Player state constants from `youtube-player`. Re-declared here
 * because the upstream package ships no TypeScript declarations.
 * Values match
 * https://developers.google.com/youtube/iframe_api_reference#onStateChange
 */
const PlayerStates = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  VIDEO_CUED: 5,
} as const;

export interface YouTubePlayerProps {
  youtubeId: string;
  initialSecond: number;
  /** Called ~10s into playback and on every pause/seek/buffer event. */
  onProgress: (currentSecond: number) => void;
  /** Called exactly once when the YouTube `ended` event fires. */
  onCompleted: () => void;
}

const POLL_INTERVAL_MS = 10_000;
const READY_TIMEOUT_MS = 5_000;

export default function YouTubePlayer({
  youtubeId,
  initialSecond,
  onProgress,
  onCompleted,
}: YouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const lastSecondRef = useRef<number>(initialSecond);
  const completedFiredRef = useRef<boolean>(false);
  // `ready` flips to true on the first onReady callback. If it stays
  // false past READY_TIMEOUT_MS, we render the fallback.
  const [ready, setReady] = useState<boolean>(false);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  // The parent passes `key={playing.id}` so the component remounts on
  // every video change. We do not need a `youtubeId`-driven state reset
  // effect — that would be a React-19 anti-pattern (setState in effect).

  // 5s onReady timeout. If onReady never fires (CSP block, network,
  // YouTube outage) the parent modal shows a non-blocking fallback and
  // onProgress / onCompleted are NOT called, so no resume state is
  // polluted by a broken view.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setReady((r) => {
        if (!r) setTimedOut(true);
        return r;
      });
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [youtubeId]);

  // 10s polling timer. Lives only while the component is mounted. We
  // always read the live `playerRef.current` and call onProgress through
  // the most recent closure via the ref pattern.
  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const state = typeof player.getPlayerState === "function"
        ? player.getPlayerState()
        : null;
      if (state !== PlayerStates.PLAYING) return;
      const t = typeof player.getCurrentTime === "function"
        ? player.getCurrentTime()
        : null;
      if (typeof t === "number" && Number.isFinite(t)) {
        lastSecondRef.current = t;
        onProgress(t);
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [onProgress, youtubeId]);

  if (timedOut && !ready) {
    return <PlayerFallback youtubeId={youtubeId} initialSecond={initialSecond} />;
  }

  return (
    <YouTube
      key={youtubeId}
      videoId={youtubeId}
      opts={{
        playerVars: {
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
      }}
      onReady={(event) => {
        playerRef.current = event.target;
        setReady(true);
        if (initialSecond > 0) {
          try {
            event.target.seekTo(initialSecond, true);
          } catch {
            // Some embeds throw if seekTo is called too early; the
            // 10s poller will catch up on the next tick.
          }
        }
      }}
      onStateChange={(event) => {
        const state = event.data;
        const readTime = (): number | null => {
          if (typeof event.target.getCurrentTime !== "function") return null;
          const t = event.target.getCurrentTime();
          return typeof t === "number" && Number.isFinite(t) ? t : null;
        };
        if (state === PlayerStates.PLAYING) {
          const t = readTime();
          if (t !== null) {
            lastSecondRef.current = t;
            onProgress(t);
          }
        } else if (
          state === PlayerStates.PAUSED ||
          state === PlayerStates.BUFFERING
        ) {
          const t = readTime();
          if (t !== null) {
            lastSecondRef.current = t;
            onProgress(t);
          }
        } else if (state === PlayerStates.ENDED) {
          if (!completedFiredRef.current) {
            completedFiredRef.current = true;
            onCompleted();
          }
        }
      }}
      iframeClassName="w-full aspect-video rounded-xl bg-black"
    />
  );
}

/**
 * The "Video tidak dapat diputar" placeholder. Shown when onReady never
 * fires within READY_TIMEOUT_MS. The original behavior was to silently
 * leave an empty black iframe; the explicit fallback makes the failure
 * mode visible and gives the user a "Buka di YouTube" link to escape.
 */
function PlayerFallback({ youtubeId, initialSecond }: { youtubeId: string; initialSecond: number }) {
  return (
    <div
      data-testid="youtube-player-fallback"
      className="w-full aspect-video rounded-xl bg-gray-100 flex flex-col items-center justify-center text-center p-6 gap-2"
    >
      <div className="text-3xl">📵</div>
      <p className="text-sm text-gray-700 font-semibold">Video tidak dapat diputar</p>
      <p className="text-xs text-gray-500">
        Pemutar YouTube tidak dapat dimuat. Periksa koneksi atau coba lagi nanti.
      </p>
      <a
        href={`https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(initialSecond)}s`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 underline mt-1"
      >
        Buka di YouTube
      </a>
    </div>
  );
}
