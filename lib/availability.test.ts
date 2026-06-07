import { describe, it, expect } from 'vitest';
import { isAvailable, isPackageAvailable, getEntityStatus } from './availability';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('getEntityStatus', () => {
  it('returns inactive when both dates null', () => {
    expect(getEntityStatus({ startDate: null, endDate: null }, NOW)).toBe('inactive');
  });

  it('returns scheduled when startDate is in future', () => {
    expect(getEntityStatus({ startDate: '2026-07-01T00:00:00Z', endDate: null }, NOW)).toBe('scheduled');
    expect(getEntityStatus({ startDate: '2026-07-01T00:00:00Z', endDate: '2026-08-01T00:00:00Z' }, NOW)).toBe('scheduled');
  });

  it('returns active when startDate in past and endDate null', () => {
    expect(getEntityStatus({ startDate: '2026-06-01T00:00:00Z', endDate: null }, NOW)).toBe('active');
  });

  it('returns active when both dates set and within window', () => {
    expect(getEntityStatus({ startDate: '2026-06-01T00:00:00Z', endDate: '2026-06-30T23:59:59Z' }, NOW)).toBe('active');
  });

  it('returns expired when endDate in past', () => {
    expect(getEntityStatus({ startDate: '2026-05-01T00:00:00Z', endDate: '2026-05-31T23:59:59Z' }, NOW)).toBe('expired');
  });

  it('returns scheduled when startDate null and endDate in future', () => {
    expect(getEntityStatus({ startDate: null, endDate: '2026-07-01T00:00:00Z' }, NOW)).toBe('scheduled');
  });

  it('returns expired when startDate null and endDate in past', () => {
    expect(getEntityStatus({ startDate: null, endDate: '2026-05-01T00:00:00Z' }, NOW)).toBe('expired');
  });
});

describe('isAvailable (active = startDate ≤ now AND (endDate null OR endDate > now))', () => {
  it('returns false for both null (inactive)', () => {
    expect(isAvailable({ startDate: null, endDate: null }, NOW)).toBe(false);
  });

  it('returns true when startDate in past and endDate null (active indefinitely)', () => {
    expect(isAvailable({ startDate: '2026-06-01T00:00:00Z', endDate: null }, NOW)).toBe(true);
  });

  it('returns true when both dates set and within window', () => {
    expect(isAvailable({ startDate: '2026-06-01T00:00:00Z', endDate: '2026-06-30T23:59:59Z' }, NOW)).toBe(true);
  });

  it('returns false when startDate is in the future (scheduled)', () => {
    expect(isAvailable({ startDate: '2026-07-01T00:00:00Z', endDate: '2026-07-31T23:59:59Z' }, NOW)).toBe(false);
  });

  it('returns false when endDate is in the past (expired)', () => {
    expect(isAvailable({ startDate: '2026-05-01T00:00:00Z', endDate: '2026-05-31T23:59:59Z' }, NOW)).toBe(false);
  });

  it('returns true when startDate exactly equals now (boundary inclusive)', () => {
    expect(isAvailable({ startDate: '2026-06-15T12:00:00Z', endDate: null }, NOW)).toBe(true);
  });

  it('treats invalid date strings as null', () => {
    // Invalid startDate → null → no start → not available
    expect(isAvailable({ startDate: 'not-a-date', endDate: '2026-06-30T23:59:59Z' }, NOW)).toBe(false);
    // Invalid endDate → null → active indefinitely (startDate valid + ≤ now)
    expect(isAvailable({ startDate: '2026-06-01T00:00:00Z', endDate: 'not-a-date' }, NOW)).toBe(true);
  });

  it('returns false when startDate null and endDate set (scheduled, not active)', () => {
    expect(isAvailable({ startDate: null, endDate: '2026-07-01T00:00:00Z' }, NOW)).toBe(false);
  });
});

describe('isPackageAvailable (deprecated alias)', () => {
  it('is the same function as isAvailable', () => {
    expect(isPackageAvailable).toBe(isAvailable);
  });
});
