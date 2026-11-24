import { auth } from "@/auth";
import { getRankingData, type RankingEntry } from "@/lib/ranking";
import { RankingParticipant } from "@/components/ranking/GlobalRanking";

const PREVIEW_LIMIT = 10;

export default async function TryoutRankingPreview() {
  const session = await auth();
  if (!session?.user?.email || (session as { isSessionStale?: boolean }).isSessionStale) return null;
  if ((session.user as { role?: string }).role !== "user") return null;
  const viewerEmail = session.user.email;

  let rankings: RankingEntry[];
  try {
    rankings = await getRankingData();
  } catch {
    return <p className="mt-4 text-sm text-slate-500">Daftar peserta belum berhasil dimuat.</p>;
  }

  const preview = rankings
    .map((entry, index) => ({ entry, rank: index + 1 }))
    .filter(({ entry }) => entry.userId !== viewerEmail)
    .slice(0, PREVIEW_LIMIT);

  if (preview.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">Belum ada peserta lain di ranking.</p>;
  }

  return (
    <ol aria-label="Peringkat peserta lain" className="mt-4 space-y-2.5">
      {preview.map(({ rank, entry }) => (
        <li key={entry.userId}>
          <RankingParticipant entry={entry} rank={rank} metric="totalScore" compact />
        </li>
      ))}
    </ol>
  );
}
