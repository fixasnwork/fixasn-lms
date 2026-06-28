"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Modal, Button, Badge } from "@/components/ui";
import { useUserVideos } from "@/hooks/useVideoQueries";
import type { Video, VideoCategory } from "@/lib/types";

const CATEGORY_ORDER: VideoCategory[] = ["TWK", "TIU", "TKP"];

const CATEGORY_COLORS: Record<VideoCategory, { bg: string; text: string }> = {
  TWK: { bg: "#EFF6FF", text: "#2563EB" },
  TIU: { bg: "#F5F3FF", text: "#7C3AED" },
  TKP: { bg: "#FFFBEB", text: "#D97706" },
};

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPage() {
  const { data, isLoading, error } = useUserVideos();
  const [playing, setPlaying] = useState<Video | null>(null);

  // 1. Loading
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="video-page-loading">
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Memuat katalog video...</span>
        </div>
      </div>
    );
  }

  // 2. Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="video-page-error">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          Gagal memuat video. Coba lagi nanti.
        </div>
      </div>
    );
  }

  // 3. Locked (no access)
  if (!data || data.hasAccess === false) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="video-page-locked">
        <h2 className="font-black text-2xl text-brand mb-1">🎬 Video Belajar</h2>
        <p className="text-gray-400 text-sm mb-6">
          Materi lengkap TWK, TIU, TKP
        </p>
        <Card className="border-2 border-dashed border-amber-300 bg-amber-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-yellow-400 flex items-center justify-center text-2xl flex-shrink-0">
              🔒
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-brand mb-1">
                Video Belajar Terkunci
              </h3>
              <p className="text-sm text-gray-600 m-0">
                Paket Video Pembelajaran memberikan akses ke katalog video TWK,
                TIU, dan TKP. Beli paket untuk membuka semua materi.
              </p>
            </div>
            <Link href="/buy" className="flex-shrink-0">
              <Button variant="gold">Beli Paket</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 4. Empty (access but no published videos)
  if (data.videos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="video-page-empty">
        <h2 className="font-black text-2xl text-brand mb-1">🎬 Video Belajar</h2>
        <p className="text-gray-400 text-sm mb-6">
          Materi lengkap TWK, TIU, TKP
        </p>
        <Card className="text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <h3 className="font-black text-lg text-gray-700 mb-1">
            Belum ada video
          </h3>
          <p className="text-sm text-gray-500 m-0">
            Admin sedang menyiapkan materi. Coba lagi nanti.
          </p>
        </Card>
      </div>
    );
  }

  // 5. Catalog — group by category in fixed order
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    videos: data.videos.filter((v) => v.category === cat),
  })).filter((g) => g.videos.length > 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="video-page-catalog">
      <h2 className="font-black text-2xl text-brand mb-1">🎬 Video Belajar</h2>
      <p className="text-gray-400 text-sm mb-6">
        Materi lengkap TWK, TIU, TKP
      </p>

      {groups.map(({ cat, videos }) => {
        const colors = CATEGORY_COLORS[cat];
        return (
          <section key={cat} className="mb-7" data-testid={`video-group-${cat}`}>
            <h3
              className="font-extrabold text-base mb-3 inline-block px-3 py-1 rounded-md"
              style={{ color: colors.text, background: colors.bg }}
            >
              {cat}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => {
                const duration = formatDuration(video.durationSec);
                return (
                  <Card
                    key={video.id}
                    className="p-0 overflow-hidden flex flex-col"
                    data-testid={`video-card-${video.id}`}
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-video bg-gray-100"
                    >
                      <Image
                        src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        width={320}
                        height={180}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </a>
                    <div className="p-3 flex-1 flex flex-col">
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-2 mb-2">
                        {video.title}
                      </h4>
                      {video.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {video.description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        {duration ? (
                          <span className="text-xs text-gray-400">⏱ {duration}</span>
                        ) : (
                          <span />
                        )}
                        <Button
                          size="sm"
                          onClick={() => setPlaying(video)}
                          data-testid={`video-mulai-${video.id}`}
                        >
                          ▶ Mulai
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Player modal */}
      <Modal
        open={playing !== null}
        onClose={() => setPlaying(null)}
        title={playing?.title ?? "Video Player"}
        width={720}
      >
        {playing && (
          <div data-testid="video-player-modal">
            <iframe
              src={`https://www.youtube.com/embed/${playing.youtubeId}?rel=0`}
              className="w-full aspect-video rounded-xl bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={playing.title}
            />
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              {playing.description && (
                <span className="line-clamp-1">{playing.description}</span>
              )}
              <Badge color={playing.category === "TWK" ? "blue" : playing.category === "TIU" ? "purple" : "yellow"}>
                {playing.category}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
