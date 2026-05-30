// ─────────────────────────────────────────────
// Ranking Page — Server Component
// Fetches ranking data (all / weekly / monthly) and passes to client shell.
// ─────────────────────────────────────────────
import { getRankingData } from '@/lib/ranking';
import { getStartOfWeek, getStartOfMonth } from '@/lib/utils';
import RankingClient from '@/components/ranking/RankingClient';

export const dynamic = 'force-dynamic'; // always fresh data

export default async function RankingPage() {
  const [all, weekly, monthly] = await Promise.all([
    getRankingData(),
    getRankingData(getStartOfWeek()),
    getRankingData(getStartOfMonth()),
  ]);

  return <RankingClient all={all} weekly={weekly} monthly={monthly} />;
}
