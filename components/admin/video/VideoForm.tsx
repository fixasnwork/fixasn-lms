"use client";

import { useState, useCallback } from "react";
import type { Video, VideoCategory } from "@/lib/types";
import { parseYouTubeId, ALLOWED_VIDEO_CATEGORIES } from "@/lib/video";
import { Button } from "@/components/ui";
import {
  useUploadVideoPdf,
  useDeleteVideoPdf,
  type CreateVideoInput,
  type UpdateVideoInput,
} from "@/hooks/useVideoQueries";

export interface VideoFormProps {
  initial?: Video;
  onSubmit: (input: CreateVideoInput | UpdateVideoInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  errorMessage?: string;
  /** Called after a successful PDF upload or delete so the parent can re-fetch. */
  onPdfChanged?: () => void;
}

const CATEGORY_COLORS: Record<VideoCategory, string> = {
  TWK: "border-blue-500 bg-blue-50 text-blue-600",
  TIU: "border-purple-500 bg-purple-50 text-purple-600",
  TKP: "border-yellow-500 bg-yellow-50 text-yellow-600",
};

const INACTIVE_CATEGORY_COLORS = "border-gray-200 bg-white text-gray-500";

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const s = sec % 60;
  return `${mins}:${String(s).padStart(2, "0")}`;
}

export default function VideoForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  onPdfChanged,
}: VideoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [youtubeInput, setYoutubeInput] = useState(initial?.youtubeId ?? "");
  const [category, setCategory] = useState<VideoCategory>(
    (initial?.category as VideoCategory) ?? "TWK"
  );
  const [durationSec, setDurationSec] = useState(
    initial?.durationSec ? String(initial.durationSec) : ""
  );
  const [sortOrder, setSortOrder] = useState(
    initial ? String(initial.sortOrder) : "0"
  );
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);

  // PDF state lives entirely inside <VideoPdfSection> so the mutation
  // hooks only mount when an admin is editing an existing video.
  // Create-mode tests that don't provide a QueryClientProvider keep
  // working.

  // Derived: live-parse the youtubeInput on every change
  const parsedId = parseYouTubeId(youtubeInput);

  // initial drives the first-render values; the parent uses a `key`
  // to remount the form when switching between create/edit, so we
  // don't need a useEffect sync here.

  const titleError = !title.trim();
  const youtubeError = !parsedId;
  const submitDisabled = titleError || youtubeError || isSubmitting;

  const handleSubmit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!parsedId) return;

    const dur = Number(durationSec);
    const hasDur = durationSec !== "" && Number.isInteger(dur) && dur >= 0;
    const srt = Number(sortOrder);
    const hasSort = Number.isInteger(srt);

    if (initial) {
      const payload: UpdateVideoInput = {
        id: initial.id,
        title: trimmed,
        description: description.trim() || undefined,
        youtubeId: parsedId,
        category,
        isPublished,
      };
      if (hasDur) payload.durationSec = dur;
      if (hasSort) payload.sortOrder = srt;
      onSubmit(payload);
    } else {
      const payload: CreateVideoInput = {
        title: trimmed,
        description: description.trim() || undefined,
        youtubeId: parsedId,
        category,
        isPublished,
      };
      if (hasDur) payload.durationSec = dur;
      if (hasSort) payload.sortOrder = srt;
      onSubmit(payload);
    }
  }, [
    title, parsedId, description, category, durationSec, sortOrder,
    isPublished, initial, onSubmit,
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Title ────────────────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Judul <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Pengantar TWK"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold"
        />
        {titleError && (
          <div className="text-xs text-red-500 mt-1">Judul tidak boleh kosong</div>
        )}
      </div>

      {/* ── Description ──────────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Deskripsi <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat video..."
          className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-y"
        />
      </div>

      {/* ── YouTube URL / ID ─────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          YouTube URL atau ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={youtubeInput}
          onChange={(e) => setYoutubeInput(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... atau ABCDEFGHIJK"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
        />
        <div className="mt-1.5 text-sm">
          {parsedId ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-green-600 font-semibold">
                ✓ ID: <code className="font-mono">{parsedId}</code>
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${parsedId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-xs"
              >
                Preview on YouTube
              </a>
              {durationSec && !isNaN(Number(durationSec)) && Number(durationSec) > 0 && (
                <span className="text-gray-400 text-xs">
                  Durasi: {formatDuration(Number(durationSec))}
                </span>
              )}
            </div>
          ) : (
            youtubeInput.trim() && (
              <span className="text-red-500 font-semibold text-xs">✗ Tidak valid</span>
            )
          )}
        </div>
      </div>

      {/* ── Category ─────────────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Kategori
        </label>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 border-2 rounded-lg cursor-pointer font-bold text-sm transition-all ${
                category === cat ? CATEGORY_COLORS[cat] : INACTIVE_CATEGORY_COLORS
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Duration ─────────────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Durasi (detik) <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <input
          type="number"
          value={durationSec}
          min={0}
          onChange={(e) => setDurationSec(e.target.value)}
          placeholder="Contoh: 888"
          className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {/* ── Sort Order ───────────────────────────── */}
      <div>
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Urutan Tampil
        </label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {/* ── Published ────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4"
          />
          Publikasikan
        </label>
      </div>

      {/* ── Error banner ─────────────────────────── */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-semibold">
          {errorMessage}
        </div>
      )}

      {/* ── PDF Module (edit only) ────────────────── */}
      <div className="border-t border-gray-200 pt-4">
        <label className="text-sm font-bold text-gray-700 block mb-1.5">
          Modul PDF <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        {!initial ? (
          <p className="text-xs text-gray-500">
            Simpan video terlebih dahulu, kemudian tambahkan modul PDF dari mode edit.
          </p>
        ) : (
          <VideoPdfSection
            videoId={initial.id}
            pdfPageCount={initial.pdfPageCount ?? null}
            onChanged={onPdfChanged}
          />
        )}
      </div>

      {/* ── Footer ───────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitDisabled}>
          {isSubmitting ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah Video"}
        </Button>
      </div>
    </div>
  );
}

/* ── Sub-component: PDF upload/delete controls ────────────────── */
// Lives in its own component so the mutation hooks only mount when an
// admin is editing an existing video. Create-mode tests that don't
// provide a QueryClientProvider still work.
function VideoPdfSection({
  videoId,
  pdfPageCount,
  onChanged,
}: {
  videoId: number;
  pdfPageCount: number | null;
  onChanged?: () => void;
}) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const uploadPdf = useUploadVideoPdf();
  const deletePdf = useDeleteVideoPdf();
  const isUploadingPdf = uploadPdf.isPending;
  const isDeletingPdf = deletePdf.isPending;
  const pdfBusy = isUploadingPdf || isDeletingPdf;

  const onUpload = useCallback(() => {
    if (!pdfFile) {
      setPdfError("Pilih file PDF terlebih dahulu");
      return;
    }
    setPdfError(null);
    uploadPdf.mutate(
      { videoId, file: pdfFile },
      {
        onSuccess: () => {
          setPdfFile(null);
          onChanged?.();
        },
        onError: (e) => setPdfError(e instanceof Error ? e.message : "Upload gagal"),
      }
    );
  }, [pdfFile, videoId, uploadPdf, onChanged]);

  const onDelete = useCallback(() => {
    if (!window.confirm("Hapus modul PDF? Tindakan ini tidak dapat dibatalkan.")) return;
    setPdfError(null);
    deletePdf.mutate(videoId, {
      onSuccess: () => onChanged?.(),
      onError: (e) => setPdfError(e instanceof Error ? e.message : "Hapus gagal"),
    });
  }, [videoId, deletePdf, onChanged]);

  return (
    <div className="flex flex-col gap-2">
      {pdfPageCount && pdfPageCount > 0 ? (
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span className="font-semibold">📄 Modul terpasang · {pdfPageCount} halaman</span>
        </div>
      ) : (
        <div className="text-xs text-gray-500">Belum ada modul PDF terpasang.</div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            setPdfError(null);
            setPdfFile(e.target.files?.[0] ?? null);
          }}
          disabled={pdfBusy}
          data-testid="video-pdf-input"
          className="text-xs"
        />
        {pdfFile && (
          <Button
            variant="primary"
            size="sm"
            onClick={onUpload}
            disabled={pdfBusy}
          >
            {isUploadingPdf ? "Mengunggah..." : pdfPageCount ? "Ganti Modul" : "Upload Modul"}
          </Button>
        )}
        {pdfPageCount && pdfPageCount > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            disabled={pdfBusy}
          >
            {isDeletingPdf ? "Menghapus..." : "Hapus Modul"}
          </Button>
        )}
      </div>
      {pdfError && (
        <div className="text-xs text-red-500 font-semibold">{pdfError}</div>
      )}
      <p className="text-xs text-gray-400">
        Maks 20MB, 200 halaman, format .pdf. Modul akan dipecah menjadi gambar per halaman.
      </p>
    </div>
  );
}
