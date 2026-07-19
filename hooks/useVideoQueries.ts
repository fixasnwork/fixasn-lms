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
import type {
	Video,
	VideoListResponse,
	VideoProgressSummary,
} from "@/lib/types";

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
			return json as {
				success: boolean;
				video: Video;
				progressReset?: boolean;
			};
		},
		onMutate: async (input) => {
			await queryClient.cancelQueries({ queryKey: ["admin-videos"] });
			const previous = queryClient.getQueryData<Video[]>(["admin-videos"]);
			if (previous) {
				// The form sends the already-normalized 11-char youtubeId (validated
				// client-side via parseYouTubeId). The server re-validates and
				// stores the same value, so the optimistic cache mirrors it
				// directly. No re-normalization needed here.
				queryClient.setQueryData<Video[]>(["admin-videos"], (current = []) =>
					current.map((v) => (v.id === input.id ? { ...v, ...input } : v)),
				);
			}
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous)
				queryClient.setQueryData(["admin-videos"], ctx.previous);
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
					current.filter((v) => v.id !== id),
				);
			}
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous)
				queryClient.setQueryData(["admin-videos"], ctx.previous);
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

/* ── Admin: upload PDF module for a video ─────────────────────── */
export interface UploadVideoPdfInput {
	videoId: number;
	file: File;
}

export interface UploadVideoPdfResult {
	success: boolean;
	pdfUrl: string | null;
	pdfPageCount: number | null;
	failedPages?: number[];
}

export function useUploadVideoPdf() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			input: UploadVideoPdfInput,
		): Promise<UploadVideoPdfResult> => {
			const form = new FormData();
			form.append("file", input.file);
			const res = await fetch(`/api/admin/videos/${input.videoId}/pdf`, {
				method: "POST",
				body: form,
			});
			const json = (await res.json()) as
				| UploadVideoPdfResult
				| { error: string };
			if (!res.ok) {
				const msg = "error" in json ? json.error : "Upload PDF gagal";
				throw new Error(msg);
			}
			return json as UploadVideoPdfResult;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
			queryClient.invalidateQueries({ queryKey: ["user-videos"] });
		},
	});
}

/* ── Admin: delete PDF module for a video ─────────────────────── */
export function useDeleteVideoPdf() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (videoId: number): Promise<{ success: boolean }> => {
			const res = await fetch(`/api/admin/videos/${videoId}/pdf`, {
				method: "DELETE",
			});
			const json = (await res.json()) as
				| { success: boolean }
				| { error: string };
			if (!res.ok) {
				const msg = "error" in json ? json.error : "Hapus PDF gagal";
				throw new Error(msg);
			}
			return json as { success: boolean };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
			queryClient.invalidateQueries({ queryKey: ["user-videos"] });
		},
	});
}

/* ── User: progress for a single video ────────────────────────── */
export function useFetchVideoProgress(videoId: number | null) {
	return useQuery<VideoProgressSummary | null>({
		enabled: typeof videoId === "number" && videoId > 0,
		queryKey: ["video-progress", videoId],
		queryFn: async (): Promise<VideoProgressSummary | null> => {
			if (typeof videoId !== "number" || videoId <= 0) return null;
			const res = await fetch(`/api/videos/${videoId}/progress`, {
				cache: "no-store",
			});
			if (!res.ok) throw new Error("Failed to fetch progress");
			// The server returns `{ progress: null }` when no row exists
			// (HTTP 200), and `{ progress: { lastSecond, ... } }` otherwise.
			const data = (await res.json()) as {
				progress: VideoProgressSummary | null;
			};
			return data.progress;
		},
		staleTime: 0,
	});
}
