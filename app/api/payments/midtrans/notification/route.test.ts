import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

const mocks = vi.hoisted(() => ({ verify: vi.fn(), find: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { paymentOrder: { findUnique: mocks.find } } }));
vi.mock('@/lib/midtrans', async (original) => ({ ...await original<typeof import('@/lib/midtrans')>(), verifyNotification: mocks.verify }));
vi.mock('@/lib/paymentOrders', () => ({ syncPaymentOrder: mocks.sync }));
const request = (body: object) => ({ json: async () => body }) as NextRequest;
beforeEach(() => vi.resetAllMocks());

describe('Midtrans notification trust boundary', () => {
  it('rejects invalid signatures before querying orders', async () => {
    mocks.verify.mockReturnValue(false);
    expect((await POST(request({ order_id: 'FX-1' }))).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it('uses authoritative provider status rather than trusting a browser or replayed payload', async () => {
    mocks.verify.mockReturnValue(true);
    const order = { id: 'uuid', orderId: 'FX-1', status: 'pending' };
    mocks.find.mockResolvedValue(order);
    expect((await POST(request({ order_id: 'FX-1', transaction_status: 'settlement' }))).status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledWith(order, true);
  });
  it('returns an error for retry when provider synchronization fails', async () => {
    mocks.verify.mockReturnValue(true);
    mocks.find.mockResolvedValue({ orderId: 'FX-1' });
    mocks.sync.mockRejectedValue(new Error('provider unavailable'));
    expect((await POST(request({ order_id: 'FX-1' }))).status).toBe(500);
  });
});
