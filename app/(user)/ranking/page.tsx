// ─────────────────────────────────────────────
// Ranking Page — Server Component
// Fetches all-time ranking data and passes to client shell.
// ─────────────────────────────────────────────
import { getRankingData } from '@/lib/ranking';
import RankingClient from '@/components/ranking/RankingClient';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // always fresh data

export default async function RankingPage() {
  const [all, viewer] = await Promise.all([
    getRankingData(),
    auth().then((session) => session?.user?.email
      ? prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
      : null),
  ]);

  return <RankingClient all={all} viewerUserId={viewer?.id} />;
}
