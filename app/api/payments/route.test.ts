import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST, PUT } from './route';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), upsert: vi.fn(), package: vi.fn(), auth: vi.fn(), findPayment: vi.fn(), findOrder: vi.fn(), mode: false }));
vi.mock('@/lib/paymentMode', () => ({ get IS_MIDTRANS_PAYMENT_ENABLED() { return mocks.mode; } }));
vi.mock('@/lib/routeAuth', () => ({ requireActiveSession: mocks.auth }));
vi.mock('@/lib/prisma', () => {
  const tx = { $queryRaw: vi.fn(), payment: { update: mocks.update, create: mocks.create, findFirst: mocks.findPayment }, paymentOrder: { findFirst: mocks.findOrder }, userPurchase: { upsert: mocks.upsert } };
  return { default: {
    package: { findFirst: mocks.package }, payment: { create: mocks.create },
    $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
  } };
});

const request = (body: object) => ({ json: async () => body }) as NextRequest;
const base = () => ({
  id: 'payment-1', userId: 'buyer@example.com', packageId: 1, status: 'pending',
  proofUrl: null, blockReason: null, accessDurationMonths: 3,
  verifiedAt: null as Date | null, accessExpiresAt: null as Date | null,
  createdAt: new Date(), updatedAt: new Date(), package: { accessDurationMonths: 12 },
});

describe('payment access lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mode = false;
    mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'buyer@example.com', role: 'admin' } } });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T04:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('snapshots the package duration at checkout without granting pending access', async () => {
    mocks.package.mockResolvedValue({ accessDurationMonths: 3, startDate: new Date('2026-01-01'), endDate: null });
    mocks.create.mockResolvedValue(base());
    expect((await POST(request({ packageId: 1 }))).status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'pending', accessDurationMonths: 3 }) });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('starts access at verification using the checkout snapshot', async () => {
    const payment = base();
    mocks.update.mockImplementation(async ({ data }) => Object.assign(payment, data));
    const response = await PUT(request({ id: payment.id, status: 'verified' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.payment.verifiedAt).toBe('2026-11-15T04:00:00.000Z');
    expect(data.payment.accessExpiresAt).toBe('2027-02-15T04:00:00.000Z');
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it('never extends an already verified payment on repeat verification', async () => {
    const payment = { ...base(), status: 'verified', verifiedAt: new Date('2026-10-01'), accessExpiresAt: new Date('2027-01-01') };
    mocks.update.mockImplementation(async ({ data }) => Object.assign(payment, data));
    const data = await (await PUT(request({ id: payment.id, status: 'verified' }))).json();
    expect(data.payment.accessExpiresAt).toBe('2027-01-01T00:00:00.000Z');
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it('preserves expiry-free legacy verified purchases', async () => {
    const payment = { ...base(), status: 'verified', accessDurationMonths: null };
    mocks.update.mockImplementation(async ({ data }) => Object.assign(payment, data));
    const data = await (await PUT(request({ id: payment.id, status: 'verified' }))).json();
    expect(data.payment.accessExpiresAt).toBeNull();
  });

  it('accepts manual proof in manual mode without granting access', async () => {
    mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'buyer@example.com', role: 'user' } } });
    mocks.package.mockResolvedValue({ accessDurationMonths: 3, startDate: new Date('2026-01-01'), endDate: null });
    mocks.create.mockResolvedValue(base());
    const response = await POST(request({ packageId: 1, proofUrl: 'data:image/png;base64,cHJvb2Y=' }));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'buyer@example.com', status: 'pending' }) });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects regular-user manual submissions in Midtrans mode', async () => {
    mocks.mode = true;
    mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'buyer@example.com', role: 'user' } } });
    expect((await POST(request({ packageId: 1, proofUrl: 'data:image/png;base64,cHJvb2Y=' }))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('prevents manual proof from creating a second purchase while a gateway order is open', async () => {
    mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'buyer@example.com', role: 'user' } } });
    mocks.package.mockResolvedValue({ accessDurationMonths: 3, startDate: new Date('2026-01-01'), endDate: null });
    mocks.findOrder.mockResolvedValue({ orderId: 'FX-1' });
    expect((await POST(request({ packageId: 1, proofUrl: 'data:image/png;base64,cHJvb2Y=' }))).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
