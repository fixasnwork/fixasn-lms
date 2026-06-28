"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatCard, Button, Card } from "@/components/ui";
import { useDashboardSummaryQuery } from "@/hooks/useDashboardSummary";
import { useUserVideos } from "@/hooks/useVideoQueries";

interface Props {
  userName: string;
}

const CATEGORY_BARS: ReadonlyArray<{
  key: "twk" | "tiu" | "tkp";
  label: string;
  color: string;
}> = [
  { key: "twk", label: "TWK - Wawasan Kebangsaan", color: "#2563EB" },
  { key: "tiu", label: "TIU - Intelegensia Umum", color: "#7C3AED" },
  { key: "tkp", label: "TKP - Karakteristik Pribadi", color: "#D97706" },
];

export default function DashboardHomeClient({ userName }: Props) {
  const router = useRouter();
  const { data: summary, isLoading, isError } = useDashboardSummaryQuery();
  const { data: videoData } = useUserVideos();

  const remainingTryouts = summary?.remainingTryouts ?? null;
  const completedTryouts = summary?.completedTryouts ?? null;
  const rank = summary?.rank ?? null;
  const categoryScores = summary?.categoryScores ?? { twk: 0, tiu: 0, tkp: 0 };
  const hasVideoAccess = videoData?.hasAccess ?? false;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-5.5">
        <h2 className="font-black text-2xl text-brand mb-0.5">
          Selamat Datang, {userName.split(" ")[0]}! 👋
        </h2>
        <p className="text-gray-400 m-0 text-sm">
          Ayo semangat belajar hari ini!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5.5">
        <StatCard
          icon="📝"
          label="Sisa Tryout"
          value={remainingTryouts === null ? "—" : remainingTryouts}
          color="#2563EB"
        />
        <StatCard
          icon="✅"
          label="Tryout Selesai"
          value={completedTryouts === null ? "—" : completedTryouts}
          color="#16A34A"
        />
        <StatCard
          icon="🏅"
          label="Peringkat"
          value={isLoading ? "—" : rank === null ? "—" : `#${rank}`}
          color="#B45309"
        />
        <StatCard
          icon="🎬"
          label="Akses Video"
          value={hasVideoAccess ? "Aktif" : "Locked"}
          color={hasVideoAccess ? "#16A34A" : "#9CA3AF"}
        />
      </div>

      {isError && (
        <div className="mb-5.5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat ringkasan dashboard. Coba segarkan halaman.
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-brand m-0">
              📈 Progress Per Materi
            </h3>
            {hasVideoAccess ? (
              <Link
                href="/video"
                className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                🎬 Tonton video belajar →
              </Link>
            ) : (
              <Link
                href="/buy"
                className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                🎬 Beli paket video →
              </Link>
            )}
          </div>
          {CATEGORY_BARS.map(({ key, label, color }) => {
            const pct = categoryScores[key];
            return (
              <div key={key} className="mb-3.5">
                <div className="flex justify-between mb-1.25">
                  <span className="text-sm font-semibold text-gray-700">
                    {label}
                  </span>
                  <span className="text-sm font-black" style={{ color }}>
                    {pct}
                  </span>
                </div>
                <div className="h-1.75 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-1000"
                    style={{
                      // Scaled against a 100 ceiling so the bar reflects the raw score.
                      // Replace with /max once a per-attempt max is decided.
                      width: `${Math.min(100, Math.max(0, pct))}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="font-extrabold text-sm text-brand mb-3.5">
            ⚡ Aksi Cepat
          </h3>
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push("/tryout")}
              disabled={remainingTryouts !== null && remainingTryouts <= 0}
            >
              📝 Mulai Tryout
            </Button>
            <Button
              variant="gold"
              className="w-full"
              onClick={() => router.push("/video")}
            >
              🎬 Video Belajar
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/ranking")}
            >
              🏅 Lihat Ranking
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
