'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { PaymentMethodCode } from '@/lib/paymentMethods';
import type { PaymentOrderView } from '@/lib/paymentOrderTypes';
import { OPEN_ORDER_STATUSES } from '@/lib/paymentOrderTypes';

async function readResponse(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Pembayaran gagal dimuat.');
  return body;
}
export function usePaymentOrders(email?: string) {
  return useQuery<PaymentOrderView[]>({
    queryKey: ['payment-orders', email], enabled: !!email,
    queryFn: async () => (await readResponse(await fetch('/api/payments/orders', { cache: 'no-store' }))).orders,
    staleTime: 0,
  });
}
export function useCheckout() {
  return useMutation<{ order: PaymentOrderView }, Error, { packageId: number; paymentMethod: PaymentMethodCode }>({
    mutationFn: async (input) => readResponse(await fetch('/api/payments/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    })),
  });
}
export function usePaymentOrder(orderId: string, email?: string) {
  return useQuery<{ order: PaymentOrderView; syncUnavailable: boolean }>({
    queryKey: ['payment-order', orderId, email], enabled: !!email,
    queryFn: async () => readResponse(await fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' })),
    staleTime: 0, retry: false,
    refetchInterval: (query) => query.state.data && OPEN_ORDER_STATUSES.includes(query.state.data.order.status) ? 15_000 : false,
  });
}
