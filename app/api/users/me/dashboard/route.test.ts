import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  mockAttemptFindMany: vi.fn(),
  mockPaymentFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockAuth: vi.fn(),
  mockGetUserRank: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    tryoutAttempt: { findMany: mocks.mockAttemptFindMany },
    payment: { findMany: mocks.mockPaymentFindMany },
    user: { findUnique: mocks.mockUserFindUnique },
  },
}));

vi.mock('@/auth', () => ({ auth: mocks.mockAuth }));

vi.mock('@/lib/ranking', async () => {
  const actual = await vi.importActual('@/lib/ranking');
  return { ...actual, getUserRank: mocks.mockGetUserRank };
});

import { GET } from './route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/users/me/dashboard');
}

const SESSION = {
  user: { email: 'user@example.com', name: 'User', role: 'admin', activeSessionVersion: 1 },
  isSessionStale: false,
};

// Helper: build a tryout attempt row.
function attempt(
  tryoutId: number,
  finishedAt: Date | null,
  createdAt: Date,
  scores: { twkScore?: number; tiuScore?: number; tkpScore?: number } = {}
) {
  return { tryoutId, finishedAt, createdAt, twkScore: scores.twkScore ?? 0, tiuScore: scores.tiuScore ?? 0, tkpScore: scores.tkpScore ?? 0 };
}

// Helper: build a payment row with package startDate/endDate and tryouts.
function payment(pkgDates: { startDate: Date; endDate: Date }, ...tryoutIds: number[]) {
  return {
    package: {
      startDate: pkgDates.startDate,
      endDate: pkgDates.endDate,
      packageTryouts: tryoutIds.map((id) => ({
        tryout: { id, startDate: pkgDates.startDate, endDate: pkgDates.endDate, deletedAt: null },
      })),
    },
  };
}

describe('GET /api/users/me/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUserFindUnique.mockResolvedValue({ isBlocked: false });
    // Default: no payments → no active tryouts
    mocks.mockPaymentFindMany.mockResolvedValue([]);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
    mocks.mockGetUserRank.mockResolvedValue(null);
  });

  it('returns 401 when no session', async () => {
    mocks.mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 with computed summary for a user with finished attempts', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([
      payment({ startDate: new Date('2025-01-01'), endDate: new Date('2027-01-01') }, 1, 2),
    ]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      attempt(2, new Date('2025-01-10'), new Date('2025-01-10'), { twkScore: 50, tiuScore: 40, tkpScore: 130 }),
      attempt(2, new Date('2025-01-05'), new Date('2025-01-05'), { twkScore: 40, tiuScore: 30, tkpScore: 120 }),
      attempt(1, new Date('2025-01-01'), new Date('2025-01-01'), { twkScore: 70, tiuScore: 60, tkpScore: 150 }),
    ]);
    mocks.mockGetUserRank.mockResolvedValue({ rank: 4, totalScore: 720, tryoutCount: 2 });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      remainingTryouts: 0,
      completedTryouts: 2,
      rank: 4,
      totalScore: 720,
      tryoutCount: 2,
      categoryScores: { twk: 160, tiu: 130, tkp: 400 },
    });
  });

  it('counts in-progress tryouts as remaining (matches the tryout page resumable count)', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([
      payment({ startDate: new Date('2025-01-01'), endDate: new Date('2027-01-01') }, 1, 2),
    ]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      attempt(1, null, new Date('2025-02-01')),
      attempt(2, null, new Date('2025-02-02')),
    ]);
    mocks.mockGetUserRank.mockResolvedValue({ rank: 5, totalScore: 0, tryoutCount: 2 });

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.remainingTryouts).toBe(2);
    expect(data.completedTryouts).toBe(0);
  });

  it('re-attempted tryout: original finished excluded, re-attempt counts as remaining', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([
      payment({ startDate: new Date('2025-01-01'), endDate: new Date('2027-01-01') }, 1),
    ]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      attempt(1, null, new Date('2025-02-15')),
      attempt(1, new Date('2025-01-01'), new Date('2025-01-01'), { twkScore: 70, tiuScore: 60, tkpScore: 150 }),
    ]);
    mocks.mockGetUserRank.mockResolvedValue({ rank: 1, totalScore: 340, tryoutCount: 1 });

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.remainingTryouts).toBe(1);
    expect(data.completedTryouts).toBe(0);
    expect(data.categoryScores).toEqual({ twk: 70, tiu: 60, tkp: 150 });
  });

  it('dedups multiple in-progress attempts for the same tryout', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([
      payment({ startDate: new Date('2025-01-01'), endDate: new Date('2027-01-01') }, 1),
    ]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      attempt(1, null, new Date('2025-02-10')),
      attempt(1, null, new Date('2025-02-05')),
    ]);
    mocks.mockGetUserRank.mockResolvedValue({ rank: 1, totalScore: 0, tryoutCount: 1 });

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.remainingTryouts).toBe(1);
    expect(data.completedTryouts).toBe(0);
  });

  it('excludes tryouts in packages the user no longer owns (no Payment)', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    // User has NO payments → active tryout set is empty.
    // User has a historical finished attempt from a previous package.
    mocks.mockPaymentFindMany.mockResolvedValue([]);
    mocks.mockAttemptFindMany.mockResolvedValue([
      attempt(1, new Date('2025-01-01'), new Date('2025-01-01'), { twkScore: 70, tiuScore: 60, tkpScore: 150 }),
    ]);
    mocks.mockGetUserRank.mockResolvedValue({ rank: 1, totalScore: 70, tryoutCount: 1 });

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.remainingTryouts).toBe(0);
    expect(data.completedTryouts).toBe(0);
    expect(data.categoryScores).toEqual({ twk: 0, tiu: 0, tkp: 0 });
  });

  it('returns zeros for a user with no attempts', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([
      payment({ startDate: new Date('2025-01-01'), endDate: new Date('2027-01-01') }, 1),
    ]);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
    mocks.mockGetUserRank.mockResolvedValue(null);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data).toEqual({
      remainingTryouts: 0,
      completedTryouts: 0,
      rank: null,
      totalScore: 0,
      tryoutCount: 0,
      categoryScores: { twk: 0, tiu: 0, tkp: 0 },
    });
  });

  it('queries Payment with correct status filter', async () => {
    mocks.mockAuth.mockResolvedValue(SESSION);
    mocks.mockPaymentFindMany.mockResolvedValue([]);
    mocks.mockAttemptFindMany.mockResolvedValue([]);
    mocks.mockGetUserRank.mockResolvedValue(null);

    await GET(makeRequest());

    expect(mocks.mockPaymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user@example.com',
          status: 'verified',
          OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: expect.any(Date) } }],
        }),
      })
    );
    expect(mocks.mockAttemptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user@example.com', deletedAt: null }),
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(mocks.mockGetUserRank).toHaveBeenCalledWith('user@example.com');
  });
});
