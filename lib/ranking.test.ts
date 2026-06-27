import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Prisma mock ──────────────────────────────────────────────────────
const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    tryoutAttempt: { findMany: mockFindMany },
  },
}));

import { getUserRank } from './ranking';

const SESSION_DATE = new Date('2026-06-27T10:00:00Z');

function attempt(overrides: Partial<{
  userId: string;
  tryoutId: number;
  totalScore: number;
  updatedAt: Date;
  createdAt: Date;
}>) {
  return {
    userId: 'u-default',
    tryoutId: 1,
    totalScore: 0,
    updatedAt: SESSION_DATE,
    createdAt: SESSION_DATE,
    ...overrides,
  };
}

describe('getUserRank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the user has no attempts at all', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getUserRank('u-me');
    expect(result).toBeNull();
  });

  it('returns null when only other users have attempts', async () => {
    mockFindMany.mockResolvedValue([
      attempt({ userId: 'u-other', tryoutId: 1, totalScore: 100 }),
    ]);
    const result = await getUserRank('u-me');
    expect(result).toBeNull();
  });

  it('single user with one attempt → rank 1', async () => {
    mockFindMany.mockResolvedValue([
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 80 }),
    ]);
    const result = await getUserRank('u-me');
    expect(result).toEqual({ rank: 1, totalScore: 80, tryoutCount: 1 });
  });

  it('sums max totalScore per tryoutId for the user', async () => {
    mockFindMany.mockResolvedValue([
      // tryout 1 — best 80 wins
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 60 }),
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 80 }),
      // tryout 2 — best 90 wins
      attempt({ userId: 'u-me', tryoutId: 2, totalScore: 90 }),
      attempt({ userId: 'u-me', tryoutId: 2, totalScore: 70 }),
    ]);
    const result = await getUserRank('u-me');
    expect(result).toEqual({ rank: 1, totalScore: 170, tryoutCount: 2 });
  });

  it('ranks me behind users with strictly higher scores', async () => {
    mockFindMany.mockResolvedValue([
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 100 }),
      attempt({ userId: 'u-a', tryoutId: 1, totalScore: 200 }),
      attempt({ userId: 'u-b', tryoutId: 1, totalScore: 150 }),
    ]);
    const result = await getUserRank('u-me');
    expect(result?.rank).toBe(3);
    expect(result?.totalScore).toBe(100);
  });

  it('breaks ties on earliest updatedAt — earlier wins', async () => {
    mockFindMany.mockResolvedValue([
      // u-me: score 100, updated LATE
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 100, updatedAt: new Date('2026-06-27T12:00:00Z') }),
      // u-tied: score 100, updated EARLIER → should beat me
      attempt({ userId: 'u-tied', tryoutId: 1, totalScore: 100, updatedAt: new Date('2026-06-27T08:00:00Z') }),
      // u-low: score 50 → below me
      attempt({ userId: 'u-low', tryoutId: 1, totalScore: 50 }),
    ]);
    const result = await getUserRank('u-me');
    expect(result?.rank).toBe(2);
  });

  it('earliest updatedAt among many attempts of the same user is the tie-breaker', async () => {
    mockFindMany.mockResolvedValue([
      // u-me: first attempt at 09:00, second at 13:00 → tie-breaker = 09:00
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 100, updatedAt: new Date('2026-06-27T13:00:00Z') }),
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 100, updatedAt: new Date('2026-06-27T09:00:00Z') }),
      // u-tied: same total 100, earliest 10:00 → u-me wins
      attempt({ userId: 'u-tied', tryoutId: 1, totalScore: 100, updatedAt: new Date('2026-06-27T10:00:00Z') }),
    ]);
    const result = await getUserRank('u-me');
    expect(result?.rank).toBe(1);
  });

  it('honors the `since` filter when computing rank', async () => {
    const since = new Date('2026-06-01T00:00:00Z');
    mockFindMany.mockResolvedValue([
      // The query is built with a createdAt >= since where clause.
      attempt({ userId: 'u-me', tryoutId: 1, totalScore: 200, createdAt: new Date('2026-06-15T00:00:00Z') }),
    ]);
    const result = await getUserRank('u-me', since);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          createdAt: { gte: since },
        }),
      })
    );
    expect(result?.rank).toBe(1);
    expect(result?.totalScore).toBe(200);
  });
});
