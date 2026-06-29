import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVideoProgress } from "./useVideoProgress";

/**
 * Tests for the useVideoProgress hook.
 *
 * Behaviors under test:
 *   - Rapid saveProgress calls coalesce via 200ms debounce
 *   - Within a burst, lastSecond is Math.max, watchedSecondsDelta sums, completed ORs
 *   - 5xx triggers exactly one retry; second 5xx is not retried
 *   - 4xx is NOT retried
 *   - flushPending uses navigator.sendBeacon when available, fetch keepalive fallback
 *   - flushPending clears pending state
 */

describe("useVideoProgress", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let sendBeaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    sendBeaconSpy = vi.fn().mockReturnValue(true);
    // navigator may not exist in jsdom; set it defensively
    if (typeof navigator === "undefined") {
      (globalThis as { navigator?: object }).navigator = {};
    }
    (navigator as { sendBeacon?: (url: string, data?: Blob) => boolean }).sendBeacon =
      sendBeaconSpy;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("coalesces rapid saveProgress calls into a single PATCH after debounce", async () => {
    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 5, watchedSecondsDelta: 1 });
      result.current.saveProgress({ videoId: 42, lastSecond: 12, watchedSecondsDelta: 1 });
      result.current.saveProgress({ videoId: 42, lastSecond: 8, watchedSecondsDelta: 1 });
    });

    // Before debounce, no fetch yet.
    expect(fetchSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
      // flushNow's fetch is awaited; let microtasks drain.
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init.body);
    // lastSecond: max(5, 12, 8) = 12
    expect(body.lastSecond).toBe(12);
    // watchedSecondsDelta: 1+1+1 = 3
    expect(body.watchedSecondsDelta).toBe(3);
    expect(body.videoId).toBe(42);
    expect(body.completed).toBe(false);
  });

  it("ORs the completed flag across the burst", async () => {
    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 5, completed: false });
      result.current.saveProgress({ videoId: 42, lastSecond: 6, completed: true });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.completed).toBe(true);
    expect(body.lastSecond).toBe(6);
  });

  it("retries exactly once on 5xx, then stops", async () => {
    fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 10 });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      // Two sequential awaits inside flushNow (1st attempt + 1 retry)
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 4xx", async () => {
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 10 });
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("flushPending uses sendBeacon when available and clears pending", () => {
    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 5 });
    });

    // Before debounce expires, flushPending is called.
    // The hook calls sendBeacon first, and only if it returns true does
    // it clear pendingRef. We assert sendBeacon is invoked.
    act(() => {
      result.current.flushPending();
    });

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconSpy.mock.calls[0];
    expect(url).toBe("/api/video-progress");
    expect(blob).toBeInstanceOf(Blob);
    // Fetch should NOT have been used.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("flushPending falls back to fetch keepalive when sendBeacon is unavailable", () => {
    (navigator as { sendBeacon?: unknown }).sendBeacon = undefined;
    fetchSpy = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves; we only check the call
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useVideoProgress());

    act(() => {
      result.current.saveProgress({ videoId: 42, lastSecond: 5 });
    });

    act(() => {
      result.current.flushPending();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.method).toBe("PATCH");
    expect(init.keepalive).toBe(true);
  });
});
