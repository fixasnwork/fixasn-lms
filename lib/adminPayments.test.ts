import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAdminPaymentAction, getAdminPayments, parseAdminPaymentFilters } from './adminPayments';
import { availablePaymentActions, type AdminPaymentRow } from './adminPaymentTypes';

const mocks = vi.hoisted(() => ({ raw: vi.fn(), payment: vi.fn(), order: vi.fn(), update: vi.fn(), user: vi.fn(), purchase: vi.fn(), sync: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(), payment: { findFirst: mocks.payment, update: mocks.update },
    paymentOrder: { findUnique: mocks.order }, user: { update: mocks.user }, userPurchase: { upsert: mocks.purchase },
  };
  return { default: { $queryRaw: mocks.raw, paymentOrder: { findUnique: mocks.order }, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('@/lib/paymentOrders', () => ({ syncPaymentOrder: mocks.sync }));
const id = '00000000-0000-0000-0000-000000000001';
const basePayment = () => ({
  id, status: 'pending', userId: 'buyer@example.com', packageId: 1, verifiedAt: null as Date | null,
  accessDurationMonths: 3, accessExpiresAt: null as Date | null, gatewayOrder: null,
  user: { isBlocked: false }, package: { accessDurationMonths: 12 },
});
const filters = { search: '', source: 'all', status: 'all', access: 'all', page: 1 };
beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => vi.useRealTimers());

describe('admin payment search', () => {
  it.each(['page=0', 'page=1.5', 'page=NaN', 'source=unknown', 'status=unknown', 'access=unknown'])('rejects invalid filters %s', (input) => {
    expect(() => parseAdminPaymentFilters(new URLSearchParams(input))).toThrow('Filter');
  });
  it('keeps malicious search text in SQL parameters and returns total count for an empty page', async () => {
    mocks.raw.mockResolvedValue([{ total: BigInt(40), payments: [], summary: { total: 40, pending: 0, paid: 0, blocked: 0 } }]);
    const search = "%' OR 1=1 --";
    const result = await getAdminPayments({ ...filters, search, page: 2, source: 'midtrans', status: 'pending' });
    expect(result).toMatchObject({ total: 40, payments: [], page: 2, pageSize: 20, summary: { total: 40, pending: 0, paid: 0, blocked: 0 } });
    const sql = mocks.raw.mock.calls[0][0];
    expect(sql.sql).not.toContain(search);
    expect(sql.values).toContain('midtrans');
    expect(sql.values).toContain("%\\%' OR 1=1 --%");
    expect(sql.sql).toContain('NOT EXISTS');
    expect(sql.sql).not.toContain('"proofUrl"');
  });
});

describe('admin payment transitions', () => {
  it('verifies manual proof once using the duration snapshot', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-25T05:00:00Z'));
    const payment = basePayment();
    mocks.payment.mockImplementation(async () => payment);
    mocks.update.mockImplementation(async ({ data }) => Object.assign(payment, data));
    await applyAdminPaymentAction('manual', id, 'verify', undefined);
    expect(payment.status).toBe('verified');
    expect(payment.accessExpiresAt?.toISOString()).toBe('2027-02-25T05:00:00.000Z');
    expect(mocks.purchase).toHaveBeenCalledOnce();
    await expect(applyAdminPaymentAction('manual', id, 'verify', undefined)).rejects.toThrow('menunggu verifikasi');
    expect(mocks.purchase).toHaveBeenCalledOnce();
  });
  it('rejects manual proof without granting access', async () => {
    mocks.payment.mockResolvedValue(basePayment());
    await applyAdminPaymentAction('manual', id, 'reject', 'Nominal tidak sesuai');
    expect(mocks.update).toHaveBeenCalledWith({ where: { id }, data: { status: 'rejected', blockReason: 'Nominal tidak sesuai' } });
    expect(mocks.purchase).not.toHaveBeenCalled();
  });
  it('does not let manual verification override the gateway', async () => {
    mocks.order.mockResolvedValue({ paymentId: id, userId: 'buyer@example.com', status: 'pending' });
    mocks.payment.mockResolvedValue(basePayment());
    await expect(applyAdminPaymentAction('midtrans', id, 'verify', undefined)).rejects.toThrow('manual');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('restores blocked gateway access without restarting its clock', async () => {
    mocks.order.mockResolvedValue({ paymentId: id, userId: 'buyer@example.com', status: 'paid' });
    mocks.payment.mockResolvedValue({ ...basePayment(), status: 'blocked', verifiedAt: new Date('2026-10-01'), accessExpiresAt: new Date('2027-01-01') });
    await applyAdminPaymentAction('midtrans', id, 'restore', undefined);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id }, data: { status: 'verified', blockReason: null } });
    expect(mocks.purchase).not.toHaveBeenCalled();
  });
  it('prevents restoring a refunded gateway transaction', async () => {
    mocks.order.mockResolvedValue({ paymentId: id, userId: 'buyer@example.com', status: 'refunded' });
    mocks.payment.mockResolvedValue({ ...basePayment(), status: 'blocked' });
    await expect(applyAdminPaymentAction('midtrans', id, 'restore', undefined)).rejects.toThrow('tidak dapat dipulihkan');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('prevents manual verification for a blocked account', async () => {
    mocks.payment.mockResolvedValue({ ...basePayment(), user: { isBlocked: true } });
    await expect(applyAdminPaymentAction('manual', id, 'verify', undefined)).rejects.toThrow('blokir akun');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(['reject', 'block', 'ban'] as const)('requires a reason for %s', async (action) => {
    await expect(applyAdminPaymentAction('manual', id, action, ' ')).rejects.toThrow('alasan');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('checks Midtrans status instead of changing it manually', async () => {
    const order = { id, status: 'pending' };
    mocks.order.mockResolvedValue(order);
    await applyAdminPaymentAction('midtrans', id, 'sync', undefined);
    expect(mocks.sync).toHaveBeenCalledWith(order, true);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe('row action eligibility', () => {
  it('offers verification only for pending manual payments and gateway sync only for Midtrans', () => {
    const manual = { source: 'manual', status: 'pending', paymentId: id, accessPaymentStatus: 'pending', userIsBlocked: false } as AdminPaymentRow;
    expect(availablePaymentActions(manual)).toEqual(['verify', 'reject', 'ban']);
    expect(availablePaymentActions({ ...manual, source: 'midtrans' })).toEqual(['sync', 'ban']);
    expect(availablePaymentActions({ ...manual, userIsBlocked: true })).toEqual(['reject', 'unban']);
  });
});
