'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { PurchaseHistoryItem, PurchaseHistoryPage } from '@/lib/purchaseHistoryTypes';

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Pembelian gagal dimuat.');
  return data;
}

export function usePurchaseHistory(email?: string) {
  return useInfiniteQuery({
    queryKey: ['purchase-history', email], enabled: !!email,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => readResponse<PurchaseHistoryPage>(await fetch(`/api/purchases${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, { cache: 'no-store' })),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.pages.some((page) => page.purchases.some((item) => ['pending', 'creating'].includes(item.status))) ? 30_000 : false,
  });
}

export function useManualPurchase(id: string, email?: string) {
  return useQuery({
    queryKey: ['manual-purchase', id, email], enabled: !!email,
    queryFn: async () => readResponse<{ purchase: PurchaseHistoryItem; proofUrl: string | null }>(await fetch(`/api/purchases/manual/${encodeURIComponent(id)}`, { cache: 'no-store' })),
    retry: false, staleTime: 0,
    refetchInterval: (query) => query.state.data?.purchase.status === 'pending' ? 30_000 : false,
  });
}
