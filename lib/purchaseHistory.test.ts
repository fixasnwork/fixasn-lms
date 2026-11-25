import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeHistoryCursor, getManualPurchase, getPurchaseHistory, mapGatewayPurchase, mapManualPurchase } from './purchaseHistory';

const mocks = vi.hoisted(() => ({ payments: vi.fn(), orders: vi.fn(), detail: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { payment: { findMany: mocks.payments, findFirst: mocks.detail }, paymentOrder: { findMany: mocks.orders } } }));
type ManualRow = Parameters<typeof mapManualPurchase>[0];
type GatewayRow = Parameters<typeof mapGatewayPurchase>[0];
const id = (value: number) => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`;
const manual = (value: number, createdAt = '2026-11-25T05:00:00Z'): ManualRow => ({
  id: id(value), packageId: 1, status: 'pending', createdAt: new Date(createdAt), verifiedAt: null,
  accessExpiresAt: null, accessDurationMonths: 3, deletedAt: null, blockReason: null,
  package: { name: 'Paket Manual', includesVideoPembelajaran: false, tryoutCount: 5, _count: { packageTryouts: 5 } },
});
const gateway = (value: number, createdAt = '2026-11-25T06:00:00Z'): GatewayRow => ({
  id: id(value), orderId: `FX-${value}`, packageId: 1, packageName: 'Snapshot Paket', status: 'pending', createdAt: new Date(createdAt),
  paymentMethod: 'qris', amount: 100000, adminFee: 700, totalAmount: 100700,
  accessDurationMonths: 3, paidAt: null, package: manual(1).package, payment: null,
});
beforeEach(() => { vi.resetAllMocks(); mocks.payments.mockResolvedValue([]); mocks.orders.mockResolvedValue([]); });
afterEach(() => vi.useRealTimers());

describe('combined purchase history', () => {
  it('merges both sources newest first, excludes gateway payments from manual rows, and omits proofs from list queries', async () => {
    mocks.payments.mockResolvedValue([manual(1)]);
    mocks.orders.mockResolvedValue([gateway(2)]);
    const page = await getPurchaseHistory('me@example.com', { manual: null, midtrans: null });
    expect(page.purchases.map((item) => item.reference)).toEqual(['FX-2', id(1)]);
    expect(page.nextCursor).toBeNull();
    expect(mocks.payments).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'me@example.com', deletedAt: null, gatewayOrder: { is: null } } }));
    expect(mocks.orders).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'me@example.com' } }));
    expect(mocks.payments.mock.calls[0][0].select).not.toHaveProperty('proofUrl');
  });

  it('paginates each source at the last consumed row, preserving unread rows from the other source', async () => {
    mocks.orders.mockResolvedValue(Array.from({ length: 21 }, (_, index) => gateway(index + 1)));
    mocks.payments.mockResolvedValue([manual(100)]);
    const first = await getPurchaseHistory('me@example.com', { manual: null, midtrans: null });
    expect(first.purchases).toHaveLength(20);
    expect(decodeHistoryCursor(first.nextCursor)).toEqual({ manual: null, midtrans: id(20) });
    mocks.orders.mockResolvedValue([gateway(21)]);
    const second = await getPurchaseHistory('me@example.com', decodeHistoryCursor(first.nextCursor));
    expect(second.purchases.map((item) => item.reference)).toEqual(['FX-21', id(100)]);
    expect(second.nextCursor).toBeNull();
    expect(mocks.orders).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: { id: id(20) }, skip: 1 }));
    expect(mocks.payments.mock.calls[1][0]).not.toHaveProperty('cursor');
  });

  it('preserves historic gateway totals and does not invent a total for manual payments', () => {
    expect(mapGatewayPurchase(gateway(1))).toMatchObject({ packageName: 'Snapshot Paket', amount: 100000, adminFee: 700, totalAmount: 100700 });
    expect(mapManualPurchase(manual(2))).toMatchObject({ amount: null, adminFee: null, totalAmount: null });
  });

  it('opens packages only while their payment has active access', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-25T08:00:00Z'));
    const payment = { ...manual(1), status: 'verified', accessExpiresAt: new Date('2027-01-01') };
    expect(mapManualPurchase(payment).accessStatus).toBe('active');
    expect(mapManualPurchase({ ...payment, accessExpiresAt: new Date('2026-01-01') }).accessStatus).toBe('expired');
    expect(mapGatewayPurchase({ ...gateway(2), status: 'paid', payment: { ...payment, status: 'blocked' } }).accessStatus).toBe('blocked');
    expect(mapGatewayPurchase({ ...gateway(2), status: 'refunded', payment: { ...payment, status: 'rejected' } }).accessStatus).toBe('inactive');
    expect(mapManualPurchase({ ...payment, deletedAt: new Date() }).accessStatus).toBe('inactive');
  });

  it('keeps legacy verified payments active when no expiry was recorded', () => {
    expect(mapManualPurchase({ ...manual(1), status: 'verified' }).accessStatus).toBe('active');
  });

  it('scopes manual proofs to the owner and excludes gateway-linked payments', async () => {
    mocks.detail.mockResolvedValue({ ...manual(1), proofUrl: 'data:image/png;base64,cHJvb2Y=' });
    const detail = await getManualPurchase('me@example.com', id(1));
    expect(detail?.proofUrl).toContain('data:image/png');
    expect(mocks.detail).toHaveBeenCalledWith(expect.objectContaining({ where: { id: id(1), userId: 'me@example.com', deletedAt: null, gatewayOrder: { is: null } } }));
    expect(await getManualPurchase('me@example.com', 'invalid')).toBeNull();
    expect(mocks.detail).toHaveBeenCalledOnce();
  });

  it.each(['invalid', Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ manual: 'not-uuid', midtrans: null })).toString('base64url')])('rejects invalid cursors %s', (cursor) => {
    expect(() => decodeHistoryCursor(cursor)).toThrow('Cursor');
  });
});
