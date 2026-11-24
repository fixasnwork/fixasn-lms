import { Suspense } from "react";
import { auth } from "@/auth";
import { getRankingData } from "@/lib/ranking";
import TryoutPageClient from "./TryoutPageClient";

const PREVIEW_LIMIT = 10;

function maskName(name: string) {
  return name.trim().split(/\s+/u).map((word) => {
    const characters = Array.from(word);
    if (characters.length <= 2) return "*".repeat(characters.length);
    return characters.map((character, index) =>
      index === 0 || (index > 1 && index % 2 === 1) ? character : "*",
    ).join("");
  }).join(" ") || "*****";
}

async function RankingPreview() {
  const session = await auth();
  if (!session?.user?.email || (session as { isSessionStale?: boolean }).isSessionStale) return null;
  if ((session.user as { role?: string }).role !== "user") return null;
  const viewerEmail = session.user.email;

  try {
    const rankings = await getRankingData();
    const preview = rankings
      .map(({ userId, name, totalScore }, index) => ({ userId, name, totalScore, rank: index + 1 }))
      .filter(({ userId }) => userId !== viewerEmail)
      .slice(0, PREVIEW_LIMIT);

    if (preview.length === 0) {
      return <p className="mt-4 text-sm text-slate-500">Belum ada peserta lain di ranking.</p>;
    }

    return (
      <ol aria-label="Peringkat peserta lain" className="mt-4 space-y-1">
        {preview.map(({ rank, name, totalScore }) => (
          <li key={rank} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span aria-label={`Peringkat ${rank}`} className="min-w-7 text-xs font-semibold tabular-nums text-slate-500">#{rank}</span>
            <span className="wrap-break-word font-medium text-slate-800">{maskName(name)}</span>
            <span className="font-semibold tabular-nums text-brand">{totalScore.toLocaleString("id-ID")}<span className="sr-only"> poin</span></span>
          </li>
        ))}
      </ol>
    );
  } catch {
    return <p className="mt-4 text-sm text-slate-500">Daftar peserta belum berhasil dimuat.</p>;
  }
}

export default function TryoutPage() {
  return (
    <TryoutPageClient
      rankingPreview={(
        <Suspense fallback={<p role="status" className="mt-4 text-sm text-slate-500">Memuat daftar peserta...</p>}>
          <RankingPreview />
        </Suspense>
      )}
    />
  );
}
