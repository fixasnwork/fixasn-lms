import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/queryClient';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { dashboardSummaryQueryKey } from '@/hooks/useDashboardSummary';
import DashboardHomeClient from '@/components/dashboard/DashboardHomeClient';
import type { DashboardSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const session = await auth();
  const userName = session?.user?.name || 'Pengguna';
  const userId = getEmailFromSessionUser(session?.user) || '';

  if (!userId) {
    // Layout already guards against this, but be defensive: no session ⇒ login.
    redirect('/login');
  }

  // Server-side prefetch so the first client render reads from the
  // dehydrated cache instead of triggering a network refetch.
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery<DashboardSummary>({
    queryKey: dashboardSummaryQueryKey(userId),
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/me/dashboard`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard summary');
      }
      return (await res.json()) as DashboardSummary;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardHomeClient userName={userName} />
    </HydrationBoundary>
  );
}
