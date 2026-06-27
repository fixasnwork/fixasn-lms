// ─────────────────────────────────────────────
// TanStack Query hooks for the Video Pembelajaran feature.
//   useAdminVideos    — admin list (incl. drafts, soft-deleted excluded)
//   useCreateVideo    — admin create
//   useUpdateVideo    — admin update (partial)
//   useDeleteVideo    — admin soft-delete
//   useUserVideos     — user list with hasAccess derivation
// All endpoints are under /api (admin: /api/admin/videos, user: /api/videos).
// ─────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Video, VideoListResponse } from "@/lib/types";

/* ── Admin: list all videos ───────────────────────────────────── */
export function useAdminVideos() {
  return useQuery<Video[]>({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const res = await fetch("/api/admin/videos", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      const data = await res.json();
      return data.videos as Video[];
    },
    staleTime: 30_000,
  });
}

/* ── Admin: create ─────────────────────────────────────────────── */
export interface CreateVideoInput {
  title: string;
  description?: string | null;
  /** Full YouTube URL or 11-char id. Server re-validates. */
  youtubeId: string;
  category: "TWK" | "TIU" | "TKP";
  durationSec?: number | null;
  sortOrder?: number;
  isPublished?: boolean;
}

export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVideoInput) => {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create video");
      return json as { success: boolean; video: Video };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["user-videos"] });
    },
  });
}

/* ── Admin: update (partial) ──────────────────────────────────── */
export interface UpdateVideoInput {
  id: number;
  title?: string;
  description?: string | null;
  /** Full YouTube URL or 11-char id. Server re-validates. */
  youtubeId?: string;
  category?: "TWK" | "TIU" | "TKP";
  durationSec?: number | null;
  sortOrder?: number;
  isPublished?: boolean;
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateVideoInput) => {
      const { id, ...body } = input;
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update video");
      return json as { success: boolean; video: Video };
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["admin-videos"] });
      const previous = queryClient.getQueryData<Video[]>(["admin-videos"]);
      if (previous) {
        queryClient.setQueryData<Video[]>(["admin-videos"], (current = []) =>
          current.map((v) => (v.id === input.id ? { ...v, ...input } : v))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["admin-videos"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["user-videos"] });
    },
  });
}

/* ── Admin: delete (soft) ─────────────────────────────────────── */
export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete video");
      return json as { success: boolean };
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-videos"] });
      const previous = queryClient.getQueryData<Video[]>(["admin-videos"]);
      if (previous) {
        queryClient.setQueryData<Video[]>(["admin-videos"], (current = []) =>
          current.filter((v) => v.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["admin-videos"], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      queryClient.invalidateQueries({ queryKey: ["user-videos"] });
    },
  });
}

/* ── User: list with hasAccess derivation ─────────────────────── */
export function useUserVideos() {
  return useQuery<VideoListResponse>({
    queryKey: ["user-videos"],
    queryFn: async () => {
      const res = await fetch("/api/videos", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return (await res.json()) as VideoListResponse;
    },
    staleTime: 60_000,
  });
}
