'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminPaymentAction, AdminPaymentFilters, AdminPaymentRow, AdminPaymentsPage } from '@/lib/adminPaymentTypes';

async function responseBody<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Pembayaran belum dapat diproses.');
  return body;
}
export function useAdminPaymentsTable(filters: AdminPaymentFilters) {
  return useQuery({
    queryKey: ['admin-payments-table', filters],
    queryFn: async () => responseBody<AdminPaymentsPage>(await fetch(`/api/admin/payments?${new URLSearchParams({ ...filters, page: String(filters.page) })}`, { cache: 'no-store' })),
    placeholderData: keepPreviousData, staleTime: 0, refetchInterval: 30_000,
  });
}
export function useAdminPaymentDetail(row: AdminPaymentRow | null) {
  return useQuery({
    queryKey: ['admin-payment-detail', row?.source, row?.id], enabled: !!row,
    queryFn: async () => responseBody<{ payment: AdminPaymentRow; proofUrl: string | null }>(await fetch(`/api/admin/payments/${row!.source}/${row!.id}`, { cache: 'no-store' })),
    staleTime: 0, retry: false,
  });
}
export function useAdminPaymentAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ row, action, reason }: { row: AdminPaymentRow; action: AdminPaymentAction; reason?: string }) => responseBody(await fetch(`/api/admin/payments/${row.source}/${row.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }),
    })),
    onSuccess: () => {
      for (const key of ['admin-payments-table', 'admin-payment-detail', 'admin-payments', 'admin-payment-orders', 'payments', 'purchase-history', 'manual-purchase', 'payment-order', 'dashboard', 'user-videos']) {
        void client.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
