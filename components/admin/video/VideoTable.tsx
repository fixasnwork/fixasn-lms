"use client";

import type { Video } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

export interface VideoTableProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  isDeletingId?: number;
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const s = sec % 60;
  return `${mins}:${String(s).padStart(2, "0")}`;
}

const CATEGORY_BADGE_MAP: Record<string, "blue" | "purple" | "yellow"> = {
  TWK: "blue",
  TIU: "purple",
  TKP: "yellow",
};

export default function VideoTable({
  videos,
  onEdit,
  onDelete,
  isDeletingId,
}: VideoTableProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Belum ada video. Klik &quot;+ Tambah Video&quot; untuk menambahkan.
      </div>
    );
  }

  return (
    <div>
      {/* ── Mobile Card List ─────────────────────── */}
      <div data-testid="video-mobile-list" className="md:hidden flex flex-col gap-3 p-3">
        {videos.map((video, idx) => (
          <div
            key={video.id}
            className="rounded-xl border border-gray-100 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="text-xs text-gray-400 font-semibold mb-1">
                  #{idx + 1}
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={CATEGORY_BADGE_MAP[video.category] ?? "blue"}>
                    {video.category}
                  </Badge>
                  <Badge color={video.isPublished ? "green" : "gray"}>
                    {video.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => onEdit(video)}>
                  ✏️
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isDeletingId === video.id}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Hapus video ini? Tindakan ini tidak dapat dibatalkan."
                      )
                    ) {
                      onDelete(video);
                    }
                  }}
                >
                  🗑️
                </Button>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
              {video.title}
            </p>

            <div className="flex items-center gap-3 text-xs">
              <code className="font-mono text-gray-500">{video.youtubeId}</code>
              {video.durationSec && video.durationSec > 0 && (
                <span className="text-gray-400">
                  {formatDuration(video.durationSec)}
                </span>
              )}
              <span className="text-gray-300">Sort: {video.sortOrder}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Table ────────────────────────── */}
      <div data-testid="video-desktop-table" className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Kategori
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Judul
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                YouTube ID
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Durasi
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Sort
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, idx) => (
              <tr
                key={video.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2.5 text-xs text-gray-400 font-semibold">
                  {idx + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Badge color={CATEGORY_BADGE_MAP[video.category] ?? "blue"}>
                    {video.category}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="max-w-xs">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">
                      {video.title}
                    </p>
                    {video.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {video.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <code className="font-mono text-xs text-gray-500">
                    {video.youtubeId}
                  </code>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">
                  {video.durationSec && video.durationSec > 0
                    ? formatDuration(video.durationSec)
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">
                  {video.sortOrder}
                </td>
                <td className="px-3 py-2.5">
                  <Badge color={video.isPublished ? "green" : "gray"}>
                    {video.isPublished ? "Published" : "Draft"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(video)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isDeletingId === video.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Hapus video ini? Tindakan ini tidak dapat dibatalkan."
                          )
                        ) {
                          onDelete(video);
                        }
                      }}
                    >
                      🗑️
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
