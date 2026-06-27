// ─────────────────────────────────────────────
// useDashboardSummary — TanStack Query hook
//
// Reads the per-user dashboard summary from /api/users/me/dashboard.
// Query key is keyed on the user id (email in this codebase) so that
// user switches in the same tab naturally invalidate / re-fetch.
// ─────────────────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { DashboardSummary } from '@/lib/types';

export const dashboardSummaryQueryKey = (userId: string | undefined) =>
  ['dashboard', 'summary', userId ?? null] as const;

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/users/me/dashboard', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }
  return (await res.json()) as DashboardSummary;
}

/**
 * Use the authenticated user's dashboard summary. Returns `null` from the
 * server when the session is missing — callers should treat that as a
 * loading state until the session is hydrated.
 */
export function useDashboardSummaryQuery() {
  const { data: session, status } = useSession();
  const userId = session?.user?.email ?? undefined;

  return useQuery<DashboardSummary>({
    queryKey: dashboardSummaryQueryKey(userId),
    queryFn: fetchDashboardSummary,
    enabled: status === 'authenticated' && !!userId,
    staleTime: 60_000,
  });
}
