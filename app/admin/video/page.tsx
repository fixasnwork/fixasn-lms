"use client";

import { useState } from "react";
import { Button, Card, Modal } from "@/components/ui";
import VideoTable from "@/components/admin/video/VideoTable";
import VideoForm from "@/components/admin/video/VideoForm";
import {
  useAdminVideos,
  useCreateVideo,
  useUpdateVideo,
  useDeleteVideo,
} from "@/hooks/useVideoQueries";
import type { Video } from "@/lib/types";
import type { CreateVideoInput, UpdateVideoInput } from "@/hooks/useVideoQueries";
import { useQueryClient } from "@tanstack/react-query";

export default function VideoPage() {
  const { data: videos = [], isLoading, error } = useAdminVideos();
  const createMutation = useCreateVideo();
  const updateMutation = useUpdateVideo();
  const deleteMutation = useDeleteVideo();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const openCreate = () => {
    setSuccessMsg("");
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (video: Video) => {
    setSuccessMsg("");
    setEditing(video);
    setShowForm(true);
  };

  // When the form's PDF upload/delete succeeds, the hook's onSuccess
  // already invalidates `['admin-videos']`, but the local `editing` state
  // still points at the pre-upload Video. Look it up in the fresh cache
  // (or fall back to the previous value) and re-mount the form with the
  // new pdfPageCount by bumping the `key`.
  const refreshEditingFromCache = () => {
    if (!editing) return;
    const fresh = queryClient.getQueryData<Video[]>(["admin-videos"]);
    if (fresh) {
      const next = fresh.find((v) => v.id === editing.id);
      if (next) setEditing(next);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    createMutation.reset();
    updateMutation.reset();
  };

  const onSubmit = (input: CreateVideoInput | UpdateVideoInput) => {
    if ("id" in input) {
      updateMutation.mutate(input as UpdateVideoInput, {
        onSuccess: () => {
          closeForm();
          setSuccessMsg("Video diperbarui.");
          setTimeout(() => setSuccessMsg(""), 2500);
        },
      });
    } else {
      createMutation.mutate(input as CreateVideoInput, {
        onSuccess: () => {
          closeForm();
          setSuccessMsg("Video ditambahkan.");
          setTimeout(() => setSuccessMsg(""), 2500);
        },
      });
    }
  };

  const onDelete = (video: Video) => {
    setDeletingId(video.id);
    deleteMutation.mutate(video.id, {
      onSettled: () => setDeletingId(null),
    });
  };

  const mutationError =
    createMutation.error?.message ??
    updateMutation.error?.message ??
    deleteMutation.error?.message;

  return (
    <div>
      {/* ── Header ───────────────────────────────── */}
      <div className="flex justify-between items-start sm:items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-black text-xl sm:text-2xl text-brand mb-1">
            Video Pembelajaran
          </h2>
          <p className="text-gray-400 text-sm m-0">
            Katalog video YouTube untuk pengguna
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Tambah Video
        </Button>
      </div>

      {/* ── Success banner ───────────────────────── */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 font-bold text-green-700 text-sm">
          {successMsg}
        </div>
      )}

      {/* ── Error banner ─────────────────────────── */}
      {mutationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 font-bold text-red-700 text-sm">
          {mutationError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
          Gagal memuat data video.
        </div>
      )}

      {/* ── Loading ──────────────────────────────── */}
      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          Memuat data video...
        </div>
      )}

      {/* ── Catalog ──────────────────────────────── */}
      {!isLoading && (
        <Card className="p-0 overflow-hidden">
          <VideoTable
            videos={videos}
            onEdit={openEdit}
            onDelete={onDelete}
            isDeletingId={deletingId ?? undefined}
          />
        </Card>
      )}

      {/* ── Form Modal ───────────────────────────── */}
      {showForm && (
        <Modal
          open
          title={editing ? "Edit Video" : "Tambah Video"}
          onClose={closeForm}
          width={600}
        >
          <VideoForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            onSubmit={onSubmit}
            onCancel={closeForm}
            onPdfChanged={refreshEditingFromCache}
            isSubmitting={
              createMutation.isPending || updateMutation.isPending
            }
            errorMessage={
              (createMutation.error || updateMutation.error)?.message
            }
          />
        </Modal>
      )}
    </div>
  );
}
