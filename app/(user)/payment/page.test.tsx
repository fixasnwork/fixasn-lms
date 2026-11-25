import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentPage from './page';
vi.mock('@/lib/paymentMode', () => ({ IS_MIDTRANS_PAYMENT_ENABLED: true }));

const state = vi.hoisted(() => ({
  packageId: '1' as string | null, mutate: vi.fn(), push: vi.fn(),
  payments: [] as { packageId: number; status: string }[],
  orders: [] as { packageId: number; orderId: string; status: string; amount: number; adminFee: number; totalAmount: number }[],
  error: null as Error | null,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(state.packageId === null ? '' : `pkg=${state.packageId}`),
  useRouter: () => ({ push: state.push }),
}));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { email: 'user@example.com' } }, status: 'authenticated' }),
}));
vi.mock('@/hooks/useTryoutQueries', () => ({
  useLogoConfig: () => ({ data: { contactWA: '6281234567890' } }),
  usePackages: () => ({ data: [{ id: 1, name: 'Paket Pilihan', description: 'Latihan SKD', price: 100000, tryoutCount: 5, accessDurationMonths: 3, startDate: '2000-01-01', endDate: null }], isPending: false, isError: false }),
  useUserPayments: () => ({ data: state.payments, isPending: false, isError: false }),
}));
vi.mock('@/hooks/usePaymentOrders', () => ({
  usePaymentOrders: () => ({ data: state.orders, isPending: false, isError: false }),
  useCheckout: () => ({ mutate: state.mutate, isPending: false, isError: !!state.error, error: state.error }),
}));
beforeEach(() => {
  state.packageId = '1'; state.payments = []; state.orders = []; state.error = null;
  state.mutate.mockReset(); state.push.mockReset();
});
afterEach(cleanup);

describe('Midtrans package checkout', () => {
  it('updates fees and total immediately when the payment method changes', () => {
    render(<PaymentPage />);
    const summary = screen.getByRole('complementary');
    expect(screen.getByRole('radio', { name: /QRIS/ })).toBeChecked();
    expect(within(summary).getByText('Rp 700')).toBeDefined();
    expect(within(summary).getByText('Rp 100.700')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /BNI Virtual Account/ }));
    expect(within(summary).getByText('Rp 104.000')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /QRIS/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Bayar Sekarang' }));
    // The browser sends identifiers only; the server owns price/fee calculation.
    expect(state.mutate.mock.calls[0][0]).toEqual({ packageId: 1, paymentMethod: 'qris' });
    expect(screen.queryByText('Paket ini sudah aktif.')).toBeNull();
  });

  it('routes uncertain checkout creation to the backend status page without showing success', () => {
    render(<PaymentPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Bayar Sekarang' }));
    act(() => state.mutate.mock.calls[0][1].onSuccess({ order: { orderId: 'FX-1', status: 'creating', snapRedirectUrl: null } }));
    expect(state.push).toHaveBeenCalledWith('/payment/FX-1');
    expect(screen.queryByText('Paket ini sudah aktif.')).toBeNull();
  });

  it('resumes an existing order using its original amount snapshot', () => {
    state.orders = [{ packageId: 1, orderId: 'FX-old', status: 'pending', amount: 90000, adminFee: 630, totalAmount: 90630 }];
    render(<PaymentPage />);
    expect(screen.getByRole('link', { name: 'Lihat Status Pembayaran' })).toHaveAttribute('href', '/payment/FX-old');
    expect(screen.getByText('Rp 90.630')).toBeDefined();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bayar Sekarang' })).toBeNull();
  });

  it.each([null, '1abc', '999'])('does not offer checkout for invalid package %s', (id) => {
    state.packageId = id;
    render(<PaymentPage />);
    expect(screen.queryByRole('button', { name: 'Bayar Sekarang' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Kembali ke Beli Paket' })).toHaveAttribute('href', '/buy');
  });

  it.each(['verified', 'pending'])('prevents checkout while a %s purchase exists', (status) => {
    state.payments = [{ packageId: 1, status }];
    render(<PaymentPage />);
    expect(screen.queryByRole('button', { name: 'Bayar Sekarang' })).toBeNull();
    if (status === 'verified') expect(screen.getByRole('link', { name: 'Buka' })).toHaveAttribute('href', '/tryout');
    else expect(screen.getByRole('status').textContent).toContain('menunggu verifikasi');
  });

  it('displays backend checkout errors without claiming access', () => {
    state.error = new Error('Pembayaran belum tersedia.');
    render(<PaymentPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Pembayaran belum tersedia.');
    expect(screen.queryByText('Paket ini sudah aktif.')).toBeNull();
  });
});
