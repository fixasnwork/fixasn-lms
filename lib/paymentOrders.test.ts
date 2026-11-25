import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMidtransStatus, createPaymentOrder, syncPaymentOrder } from './paymentOrders';
import type { PaymentOrder } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  findOrder: vi.fn(), updateOrder: vi.fn(), createOrder: vi.fn(), claim: vi.fn(),
  createPayment: vi.fn(), updatePayment: vi.fn(), purchase: vi.fn(),
  findPayment: vi.fn(), user: vi.fn(), pkg: vi.fn(), snap: vi.fn(), status: vi.fn(), mode: true,
}));
vi.mock('@/lib/paymentMode', () => ({ get IS_MIDTRANS_PAYMENT_ENABLED() { return mocks.mode; } }));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(), user: { findUnique: mocks.user }, package: { findFirst: mocks.pkg },
    paymentOrder: { findUnique: mocks.findOrder, findFirst: mocks.findOrder, findUniqueOrThrow: mocks.findOrder, update: mocks.updateOrder, create: mocks.createOrder, updateMany: mocks.claim },
    payment: { create: mocks.createPayment, update: mocks.updatePayment, findFirst: mocks.findPayment },
    userPurchase: { upsert: mocks.purchase },
  };
  return { default: { ...tx, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('@/lib/midtrans', async (original) => ({
  ...await original<typeof import('./midtrans')>(), createSnapCheckout: mocks.snap, getMidtransStatus: mocks.status,
}));

const base = (): PaymentOrder => ({
  id: 'order-uuid', orderId: 'FX-1', userId: 'buyer@example.com', packageId: 1, packageName: 'Paket SKD',
  amount: 100000, adminFee: 700, totalAmount: 100700, accessDurationMonths: 3,
  paymentMethod: 'qris', status: 'pending', transactionId: null, snapToken: 'token',
  snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/test', paymentId: null, paidAt: null,
  expiresAt: new Date('2099-01-01'), lastSyncedAt: null, createdAt: new Date(), updatedAt: new Date(),
});
const paid = { order_id: 'FX-1', gross_amount: '100700.00', transaction_id: 'transaction-1', transaction_status: 'settlement', status_code: '200', settlement_time: '2026-11-25 12:00:00' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.mode = true;
  mocks.claim.mockResolvedValue({ count: 1 });
  mocks.updateOrder.mockImplementation(async ({ data }) => ({ ...base(), ...data }));
});
afterEach(() => vi.unstubAllEnvs());

describe('gateway payment access lifecycle', () => {
  it('disables new gateway orders in manual mode', async () => {
    mocks.mode = false;
    await expect(createPaymentOrder('buyer@example.com', 'Peserta', 1, 'qris')).rejects.toThrow('dinonaktifkan');
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.snap).not.toHaveBeenCalled();
  });
  it('activates exactly once and preserves the original paid timestamp on duplicate notifications', async () => {
    const order = base();
    mocks.findOrder.mockImplementation(async () => order);
    mocks.updateOrder.mockImplementation(async ({ data }) => Object.assign(order, data));
    mocks.createPayment.mockResolvedValue({ id: 'payment-1', userId: order.userId, packageId: 1, status: 'pending', accessDurationMonths: 3, verifiedAt: null, package: { accessDurationMonths: 12 } });
    await applyMidtransStatus('FX-1', paid);
    await applyMidtransStatus('FX-1', { ...paid, settlement_time: '2026-11-26 12:00:00' });
    expect(mocks.createPayment).toHaveBeenCalledOnce();
    expect(mocks.purchase).toHaveBeenCalledOnce();
    expect(order.paidAt?.toISOString()).toBe('2026-11-25T05:00:00.000Z');
    expect(mocks.updatePayment).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accessExpiresAt: new Date('2027-02-25T05:00:00Z') }) }));
  });

  it.each(['pending', 'expire', 'deny', 'cancel'])('never grants access for %s', async (transaction_status) => {
    mocks.findOrder.mockResolvedValue(base());
    await applyMidtransStatus('FX-1', { ...paid, transaction_status });
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it.each([{ gross_amount: '100' }, { gross_amount: '100700.10' }, { order_id: 'another' }, { currency: 'USD' }])('rejects mismatched provider details %j', async (override) => {
    mocks.findOrder.mockResolvedValue(base());
    await expect(applyMidtransStatus('FX-1', { ...paid, ...override })).rejects.toThrow('tidak sesuai');
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });

  it('does not downgrade success or reactivate admin-blocked access', async () => {
    mocks.findOrder.mockResolvedValue({ ...base(), status: 'paid', paymentId: 'payment-1', paidAt: new Date('2026-11-25T05:00:00Z') });
    const result = await applyMidtransStatus('FX-1', { ...paid, transaction_status: 'pending' });
    expect(result.status).toBe('paid');
    expect(mocks.updatePayment).not.toHaveBeenCalled();
  });

  it('revokes only the refunded payment', async () => {
    mocks.findOrder.mockResolvedValue({ ...base(), status: 'paid', paymentId: 'payment-1' });
    await applyMidtransStatus('FX-1', { ...paid, transaction_status: 'refund' });
    expect(mocks.updatePayment).toHaveBeenCalledWith({ where: { id: 'payment-1' }, data: { status: 'rejected' } });
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it('keeps an unsubmitted Snap checkout pending until its configured expiry', async () => {
    mocks.status.mockResolvedValue(null);
    await syncPaymentOrder(base());
    expect(mocks.claim).toHaveBeenCalledTimes(1);
    await syncPaymentOrder({ ...base(), expiresAt: new Date('2000-01-01') });
    expect(mocks.claim).toHaveBeenLastCalledWith(expect.objectContaining({ data: { status: 'expired' } }));
  });

  it('reuses a pending order rather than generating another Snap charge', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fixasn.example');
    mocks.user.mockResolvedValue({ isBlocked: false });
    mocks.pkg.mockResolvedValue({ id: 1, name: 'Paket SKD', price: 100000, accessDurationMonths: 3, startDate: new Date('2000-01-01'), endDate: null });
    mocks.findPayment.mockResolvedValue(null);
    mocks.findOrder.mockResolvedValue(base());
    mocks.status.mockResolvedValue(null);
    const result = await createPaymentOrder('buyer@example.com', 'Peserta', 1, 'gopay');
    expect(result.paymentMethod).toBe('qris');
    expect(mocks.snap).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('calculates and snapshots the server price without activating access at checkout', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fixasn.example');
    mocks.user.mockResolvedValue({ isBlocked: false });
    mocks.pkg.mockResolvedValue({ id: 1, name: 'Paket SKD', price: 100000, accessDurationMonths: 3, startDate: new Date('2000-01-01'), endDate: null });
    mocks.findPayment.mockResolvedValue(null);
    mocks.findOrder.mockResolvedValue(null);
    mocks.createOrder.mockResolvedValue(base());
    mocks.snap.mockResolvedValue({ snapToken: 'token', snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/test' });
    await createPaymentOrder('buyer@example.com', 'Peserta', 1, 'qris');
    expect(mocks.createOrder).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 100000, adminFee: 700, totalAmount: 100700, accessDurationMonths: 3 }) });
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.purchase).not.toHaveBeenCalled();
  });

  it('retains the order reservation when Snap creation times out', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fixasn.example');
    mocks.user.mockResolvedValue({ isBlocked: false });
    mocks.pkg.mockResolvedValue({ id: 1, price: 100000, accessDurationMonths: 3, startDate: new Date('2000-01-01'), endDate: null });
    mocks.findPayment.mockResolvedValue(null);
    mocks.findOrder.mockResolvedValue({ ...base(), status: 'creating', snapToken: null, snapRedirectUrl: null });
    // First lookup finds no existing order; the later lookup reads the reservation.
    mocks.findOrder.mockResolvedValueOnce(null);
    mocks.createOrder.mockResolvedValue({ ...base(), status: 'creating' });
    mocks.snap.mockRejectedValue(new Error('timeout'));
    const result = await createPaymentOrder('buyer@example.com', 'Peserta', 1, 'qris');
    expect(result.status).toBe('creating');
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.createOrder).toHaveBeenCalledOnce();
  });
});
