import { describe, expect, it } from 'vitest';
import { accessExpiry, activePaymentWhere, hasPaymentAccess, isAccessDuration } from './packageAccess';

describe('package access duration', () => {
  it('accepts positive integer months independently of dropdown options', () => {
    expect([1, 2, 3, 6, 9, 12, 24, 30].every(isAccessDuration)).toBe(true);
    expect([0, -1, 1.5, Infinity, NaN, '1', null, undefined].some(isAccessDuration)).toBe(false);
  });

  it('clamps a calendar month to the last day of February in WITA', () => {
    expect(accessExpiry(new Date('2027-01-30T17:00:00Z'), 1).toISOString()).toBe('2027-02-27T17:00:00.000Z');
    expect(accessExpiry(new Date('2028-01-31T04:00:00Z'), 1).toISOString()).toBe('2028-02-29T04:00:00.000Z');
  });

  it('supports three months and clamps leap-day yearly access', () => {
    expect(accessExpiry(new Date('2026-11-15T04:00:00Z'), 3).toISOString()).toBe('2027-02-15T04:00:00.000Z');
    expect(accessExpiry(new Date('2028-02-29T04:00:00Z'), 12).toISOString()).toBe('2029-02-28T04:00:00.000Z');
  });

  it('denies pending, revoked and expired access, including the exact expiry instant', () => {
    const now = new Date('2026-11-15T04:00:00Z');
    for (const status of ['pending', 'rejected', 'blocked', 'expired']) {
      expect(hasPaymentAccess({ status, accessExpiresAt: '2099-01-01T00:00:00Z' }, now)).toBe(false);
    }
    expect(hasPaymentAccess({ status: 'verified', accessExpiresAt: now }, now)).toBe(false);
    expect(hasPaymentAccess({ status: 'verified', accessExpiresAt: '2026-11-15T04:00:01Z' }, now)).toBe(true);
  });

  it('preserves legacy verified access without an expiry', () => {
    expect(hasPaymentAccess({ status: 'verified', accessExpiresAt: null })).toBe(true);
  });

  it('uses the same expiry boundary in server queries', () => {
    const now = new Date();
    expect(activePaymentWhere(now)).toEqual({
      status: 'verified', deletedAt: null,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }],
    });
  });
});
