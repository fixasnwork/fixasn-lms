import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasTryoutAccess, hasVideoPackageAccess } from './packageAccessServer';

const mocks = vi.hoisted(() => ({ tryout: vi.fn(), payment: vi.fn(), purchase: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: {
  tryout: { findUnique: mocks.tryout }, payment: { findFirst: mocks.payment },
  userPurchase: { findFirst: mocks.purchase },
} }));

describe('package access gates', () => {
  beforeEach(() => vi.resetAllMocks());

  it('allows trials without a payment', async () => {
    mocks.tryout.mockResolvedValue({ isTrial: true });
    expect(await hasTryoutAccess('user@example.com', 1)).toBe(true);
    expect(mocks.payment).not.toHaveBeenCalled();
  });

  it('requires a verified, unexpired payment for the correct user and linked package', async () => {
    mocks.tryout.mockResolvedValue({ isTrial: false, packageTryouts: [] });
    mocks.payment.mockResolvedValue(null);
    expect(await hasTryoutAccess('user@example.com', 1)).toBe(false);
    expect(mocks.payment).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: 'user@example.com', status: 'verified', deletedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: expect.any(Date) } }],
      package: { deletedAt: null, packageTryouts: { some: { tryoutId: 1 } } },
    }) }));
  });

  it('allows a non-trial tryout linked to an available free package without payment', async () => {
    mocks.tryout.mockResolvedValue({ isTrial: false, packageTryouts: [{ packageId: 7 }] });
    expect(await hasTryoutAccess('user@example.com', 1)).toBe(true);
    expect(mocks.payment).not.toHaveBeenCalled();
    expect(mocks.tryout).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: {
        isTrial: true,
        packageTryouts: {
          where: { package: {
            isTrial: true, deletedAt: null, startDate: { lte: expect.any(Date) },
            OR: [{ endDate: null }, { endDate: { gt: expect.any(Date) } }],
          } },
          select: { packageId: true }, take: 1,
        },
      },
    });
  });

  it('keeps paid access when no linked free package is currently available', async () => {
    mocks.tryout.mockResolvedValue({ isTrial: false, packageTryouts: [] });
    mocks.payment.mockResolvedValue({ id: 'paid' });
    expect(await hasTryoutAccess('user@example.com', 1)).toBe(true);
  });

  it('denies access to a deleted or missing tryout', async () => {
    mocks.tryout.mockResolvedValue(null);
    expect(await hasTryoutAccess('user@example.com', 1)).toBe(false);
    expect(mocks.payment).not.toHaveBeenCalled();
  });

  it('checks all payments for video access, preserving legacy direct grants', async () => {
    mocks.purchase.mockResolvedValue({ id: 'purchase' });
    expect(await hasVideoPackageAccess('user@example.com')).toBe(true);
    expect(mocks.purchase).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: 'user@example.com',
      OR: [
        { paymentId: null },
        { package: { is: { payments: { some: expect.objectContaining({ userId: 'user@example.com', status: 'verified' }) } } } },
      ],
    }) }));
  });
});
