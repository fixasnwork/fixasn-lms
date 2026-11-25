import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseHistoryItem } from '@/lib/purchaseHistoryTypes';
import { PurchaseHistory } from './PurchaseHistory';

const state = vi.hoisted(() => ({ purchases: [] as PurchaseHistoryItem[], error: false }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { email: 'me@example.com' } } }) }));
vi.mock('@/hooks/usePurchaseHistory', () => ({ usePurchaseHistory: () => ({
  data: { pages: [{ purchases: state.purchases, nextCursor: null }] }, isPending: false,
  isFetching: false, isError: state.error, error: state.error ? new Error('Riwayat gagal dimuat.') : null,
  hasNextPage: false, refetch: vi.fn(), fetchNextPage: vi.fn(),
}) }));
const base = (): PurchaseHistoryItem => ({
  id: '1', source: 'midtrans', reference: 'FX-1', packageId: 1, packageName: 'Paket SKD', createdAt: '2026-11-25T05:00:00Z',
  status: 'pending', paymentMethod: 'qris', amount: 100000, adminFee: 700, totalAmount: 100700, accessDurationMonths: 3,
  paidAt: null, accessExpiresAt: null, accessStatus: 'inactive', openHref: '/tryout', detailHref: '/payment/FX-1', blockReason: null,
});
beforeEach(() => { state.purchases = []; state.error = false; });
afterEach(cleanup);

describe('purchase history actions', () => {
  it('shows an empty state with a purchase link', () => {
    render(<PurchaseHistory />);
    expect(screen.getByText('Belum ada pembelian')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Beli Paket' })).toHaveAttribute('href', '/buy');
  });
  it('resumes pending Midtrans checkout and shows the historic total', () => {
    state.purchases = [base()]; render(<PurchaseHistory />);
    expect(screen.getByText('Rp 100.700')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Lanjutkan Pembayaran' })).toHaveAttribute('href', '/payment/FX-1');
    expect(screen.queryByRole('link', { name: 'Buka Paket' })).toBeNull();
  });
  it('shows manual verification without a second payment action or an invented total', () => {
    state.purchases = [{ ...base(), source: 'manual', status: 'pending', totalAmount: null, detailHref: '/purchases/manual/1' }];
    render(<PurchaseHistory />);
    expect(screen.getByText('Menunggu verifikasi admin')).toBeDefined();
    expect(screen.queryByText('Nominal tidak tercatat')).toBeNull();
    expect(screen.queryByText('Total pembayaran')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Lanjutkan Pembayaran' })).toBeNull();
  });
  it('keeps expired and blocked purchases visible without opening their packages', () => {
    state.purchases = [{ ...base(), status: 'paid', accessStatus: 'active' }, { ...base(), id: '2', status: 'paid', accessStatus: 'expired' }, { ...base(), id: '3', status: 'paid', accessStatus: 'blocked' }];
    render(<PurchaseHistory />);
    const rows = screen.getAllByRole('article');
    expect(within(rows[0]).getByRole('link', { name: 'Buka Paket' })).toHaveAttribute('href', '/tryout');
    expect(within(rows[1]).queryByRole('link', { name: 'Buka Paket' })).toBeNull();
    expect(within(rows[2]).queryByRole('link', { name: 'Buka Paket' })).toBeNull();
  });
  it('shows a retry action when the history request fails', () => {
    state.error = true; render(<PurchaseHistory />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined();
    expect(screen.queryByText('Belum ada pembelian')).toBeNull();
  });
});
