import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), latest: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/routeAuth', () => ({ requireActiveSession: mocks.auth }));
vi.mock('@/lib/prisma', () => ({ default: { paymentOrder: { findFirst: mocks.find, findUniqueOrThrow: mocks.latest } } }));
vi.mock('@/lib/paymentOrders', () => ({ mapPaymentOrder: (order: unknown) => order, syncPaymentOrder: mocks.sync }));
const request = {} as NextRequest;
const context = { params: Promise.resolve({ orderId: 'FX-other' }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'me@example.com' } } });
});

describe('payment order ownership', () => {
  it('does not reveal or synchronize another account order', async () => {
    mocks.find.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(404);
    expect(mocks.find).toHaveBeenCalledWith({ where: { orderId: 'FX-other', userId: 'me@example.com' } });
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('preserves the active-session guard', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await GET(request, context)).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('reports sync failure while preserving the recorded order status', async () => {
    mocks.find.mockResolvedValue({ id: 'uuid', status: 'pending' });
    mocks.latest.mockResolvedValue({ status: 'pending' });
    mocks.sync.mockRejectedValue(new Error('timeout'));
    const response = await GET(request, context);
    expect(await response.json()).toEqual({ order: { status: 'pending' }, syncUnavailable: true });
  });
});
