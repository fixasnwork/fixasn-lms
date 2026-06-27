import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  useAdminVideos,
  useCreateVideo,
  useUpdateVideo,
  useDeleteVideo,
  useUserVideos,
} from "./useVideoQueries";
import type { UpdateVideoInput } from "./useVideoQueries";

/* ── Spies on @tanstack/react-query ──────────────────────────── */
const invalidateQueriesFn = vi.fn();
const setQueryDataFn = vi.fn();
const getQueryDataFn = vi.fn();
const cancelQueriesFn = vi.fn().mockResolvedValue(undefined);

const queryClient = {
  invalidateQueries: invalidateQueriesFn,
  setQueryData: setQueryDataFn,
  getQueryData: getQueryDataFn,
  cancelQueries: cancelQueriesFn,
};

let capturedUseQueryCalls: Array<{ key: unknown; fn: string }> = [];
let capturedUseMutationCalls: Array<{
  mutationFn: ((input: unknown) => Promise<unknown>) | null;
  onMutate: ((input: unknown) => unknown) | null;
  onError: ((_err: Error, _vars: unknown, _ctx: unknown) => void) | null;
  onSuccess: (() => void) | null;
  onSettled: (() => void) | null;
}> = [];

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn().mockImplementation(
    (config: { queryKey: string[]; queryFn: () => unknown; staleTime?: number }) => {
      capturedUseQueryCalls.push({ key: config.queryKey[0] ?? "", fn: String(config.queryFn) });
      return { data: null, isLoading: false, error: null };
    }
  ),
  useMutation: vi.fn().mockImplementation(
    (config: {
      mutationFn: (input: unknown) => Promise<unknown>;
      onMutate?: (input: unknown) => unknown;
      onError?: () => void;
      onSuccess?: () => void;
      onSettled?: () => void;
    }) => {
      capturedUseMutationCalls.push({
        mutationFn: config.mutationFn ?? null,
        onMutate: config.onMutate ?? null,
        onError: config.onError ?? null,
        onSuccess: config.onSuccess ?? null,
        onSettled: config.onSettled ?? null,
      });
      return { mutate: vi.fn(), mutateAsync: vi.fn() };
    }
  ),
  useQueryClient: () => queryClient,
}));

beforeEach(() => {
  capturedUseQueryCalls = [];
  capturedUseMutationCalls = [];
  invalidateQueriesFn.mockClear();
  setQueryDataFn.mockClear();
  cancelQueriesFn.mockClear();
});

/* ── Admin hooks ──────────────────────────────────────────────── */
describe("useAdminVideos", () => {
  it("uses queryKey ['admin-videos'] and fetches /api/admin/videos", () => {
    useAdminVideos();
    expect(capturedUseQueryCalls.length).toBe(1);
    const call = capturedUseQueryCalls[0];
    expect(call.key).toBe("admin-videos");
    expect(call.fn).toContain("/api/admin/videos");
    expect(call.fn).toContain("no-store");
  });
});

describe("useCreateVideo", () => {
  it("posts to /api/admin/videos and invalidates admin+user caches on success", async () => {
    useCreateVideo();
    expect(capturedUseMutationCalls.length).toBe(1);
    const cfg = capturedUseMutationCalls[0];

    expect(cfg.mutationFn).not.toBeNull();
    // fire onSuccess
    cfg.onSuccess?.();
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["admin-videos"] });
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["user-videos"] });
  });
});

describe("useUpdateVideo", () => {
  it("optimistic-merges via onMutate, rolls back on error, invalidates on settled", async () => {
    useUpdateVideo();
    const cfg = capturedUseMutationCalls[0];

    expect(cfg.onMutate).not.toBeNull();
    expect(cfg.onError).not.toBeNull();
    expect(cfg.onSettled).not.toBeNull();

    // Simulate previous cache state
    getQueryDataFn.mockReturnValueOnce([{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);
    const input: UpdateVideoInput = { id: 1, title: "New" };
    const ctx = await cfg.onMutate?.(input);

    expect(cancelQueriesFn).toHaveBeenCalledWith({ queryKey: ["admin-videos"] });
    expect(getQueryDataFn).toHaveBeenCalledWith(["admin-videos"]);
    // Optimistic merge should be set on the cache
    expect(setQueryDataFn).toHaveBeenCalled();

    // onError should restore previous
    cfg.onError?.(new Error("fail"), input, ctx as Record<string, unknown>);
    expect(setQueryDataFn).toHaveBeenCalledWith(["admin-videos"], [{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);

    // onSettled should invalidate
    cfg.onSettled?.();
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["admin-videos"] });
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["user-videos"] });
  });

  it("normalizes youtubeId from URL in optimistic merge", async () => {
    useUpdateVideo();
    const cfg = capturedUseMutationCalls[0];

    getQueryDataFn.mockReturnValueOnce([{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);
    await cfg.onMutate?.({ id: 1, youtubeId: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });

    // The updater passed to setQueryData should produce the 11-char id.
    const updater = setQueryDataFn.mock.calls[0][1] as (old: Record<string, unknown>[]) => Record<string, unknown>[];
    const result = updater([{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);
    expect(result[0].youtubeId).toBe("dQw4w9WgXcQ");
  });

  it("keeps raw 11-char id unchanged in optimistic merge", async () => {
    useUpdateVideo();
    const cfg = capturedUseMutationCalls[0];

    getQueryDataFn.mockReturnValueOnce([{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);
    await cfg.onMutate?.({ id: 1, youtubeId: "BBBBBBBBBBB" });

    const updater = setQueryDataFn.mock.calls[0][1] as (old: Record<string, unknown>[]) => Record<string, unknown>[];
    const result = updater([{ id: 1, title: "Old", youtubeId: "AAAAAAAAAAA" }]);
    expect(result[0].youtubeId).toBe("BBBBBBBBBBB");
  });
});

describe("useDeleteVideo", () => {
  it("optimistic-removes via onMutate, rolls back on error, invalidates on settled", async () => {
    useDeleteVideo();
    const cfg = capturedUseMutationCalls[0];

    expect(cfg.onMutate).not.toBeNull();

    getQueryDataFn.mockReturnValueOnce([
      { id: 1, title: "A" },
      { id: 2, title: "B" },
    ]);
    const ctx = await cfg.onMutate?.(1);

    expect(cancelQueriesFn).toHaveBeenCalledWith({ queryKey: ["admin-videos"] });
    expect(getQueryDataFn).toHaveBeenCalledWith(["admin-videos"]);
    expect(setQueryDataFn).toHaveBeenCalled();

    // onError should restore
    cfg.onError?.(new Error("fail"), 1, ctx as Record<string, unknown>);
    expect(setQueryDataFn).toHaveBeenCalledWith(["admin-videos"], [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
    ]);

    cfg.onSettled?.();
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["admin-videos"] });
    expect(invalidateQueriesFn).toHaveBeenCalledWith({ queryKey: ["user-videos"] });
  });
});

describe("useUserVideos", () => {
  it("uses queryKey ['user-videos'] and fetches /api/videos", () => {
    useUserVideos();
    expect(capturedUseQueryCalls.length).toBe(1);
    const call = capturedUseQueryCalls[0];
    expect(call.key).toBe("user-videos");
    expect(call.fn).toContain("/api/videos");
    expect(call.fn).toContain("no-store");
  });
});
