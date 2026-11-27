import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Prisma mocks
const mockTryoutFindUnique = vi.fn();
const mockPaymentFindFirst = vi.fn();
const mockAttemptFindFirst = vi.fn();
const mockAttemptCreate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    tryout: { findUnique: mockTryoutFindUnique },
    payment: { findFirst: mockPaymentFindFirst },
    tryoutAttempt: {
      findFirst: mockAttemptFindFirst,
      create: mockAttemptCreate,
    },
  },
}));

// Auth mock — fake session
const mockSession = {
  user: {
    email: 'rafimuhammad80@gmail.com',
    name: 'Test User',
    role: 'user',
    activeSessionVersion: 1,
  },
  isSessionStale: false,
};

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(mockSession),
}));

vi.mock('@/lib/routeAuth', () => ({
  requireActiveSession: vi.fn().mockResolvedValue({
    ok: true,
    session: mockSession,
  }),
}));

function makePostReq(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/tryout-attempts/resume'),
  } as unknown as NextRequest;
}

const MOCK_ATTEMPT = {
  id: 'att-1',
  userId: mockSession.user.email,
  userName: 'Test User',
  tryoutId: 1,
  twkScore: 0,
  tiuScore: 0,
  tkpScore: 0,
  totalScore: 0,
};

function makeTryout(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Tryout 1',
    isTrial: false,
    packageTryouts: [],
    _count: { tryoutQuestions: 110 },
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2999-12-31T23:59:59Z') as Date | null,
    deletedAt: null,
    ...overrides,
  };
}

function makeAccessPackage(overrides: Record<string, unknown> = {}) {
  return {
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2999-12-31T23:59:59Z'),
    ...overrides,
  };
}

describe('POST /api/tryout-attempts/resume — package_closed bug regression', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAttemptFindFirst.mockResolvedValue(null);
    mockAttemptCreate.mockResolvedValue(MOCK_ATTEMPT);
    vi.resetModules();
    vi.doMock('@/lib/prisma', () => ({
      default: {
        tryout: { findUnique: mockTryoutFindUnique },
        payment: { findFirst: mockPaymentFindFirst },
        tryoutAttempt: {
          findFirst: mockAttemptFindFirst,
          create: mockAttemptCreate,
        },
      },
    }));
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue(mockSession),
    }));
    vi.doMock('@/lib/routeAuth', () => ({
      requireActiveSession: vi.fn().mockResolvedValue({
        ok: true,
        session: mockSession,
      }),
    }));
    const mod = await import('./route');
    POST = mod.POST;
  });

  it('user accesses via open package → success (tryout has other closed linked packages)', async () => {
    mockTryoutFindUnique.mockResolvedValue(
      makeTryout({ id: 2 }) // the failing tryout
    );
    // The user has access through a package whose window IS open
    mockPaymentFindFirst.mockResolvedValue({
      package: makeAccessPackage(), // open
    });

    const res = await POST(makePostReq({ tryoutId: 2 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempt.isNew).toBe(true);
  });

  it('closed sales window does not revoke purchased access', async () => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({ id: 4 }));
    mockPaymentFindFirst.mockResolvedValue({
      package: makeAccessPackage({
        endDate: new Date('2026-01-02T00:00:00Z'),
      }),
    });

    const res = await POST(makePostReq({ tryoutId: 4 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('scheduled sales window does not revoke purchased access', async () => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({ id: 4 }));
    mockPaymentFindFirst.mockResolvedValue({
      package: makeAccessPackage({
        startDate: new Date('2999-01-01T00:00:00Z'),
      }),
    });

    const res = await POST(makePostReq({ tryoutId: 4 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('in-progress attempt (totalScore=0) bypasses package gate → success', async () => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({ id: 2 }));
    // Even if the user's access package is closed, resume is allowed
    mockPaymentFindFirst.mockResolvedValue({
      package: makeAccessPackage({
        endDate: new Date('2026-01-02T00:00:00Z'),
      }),
    });
    mockAttemptFindFirst.mockResolvedValue({
      id: 'att-in-progress',
      userId: mockSession.user.email,
      tryoutId: 2,
      totalScore: 0,
    });

    const res = await POST(makePostReq({ tryoutId: 2 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.isNew).toBe(false);
    expect(data.attempt.id).toBe('att-in-progress');
  });

  it('trial tryout with closed linked packages → success (no access check, no gate)', async () => {
    mockTryoutFindUnique.mockResolvedValue(
      makeTryout({ id: 5, isTrial: true })
    );
    // No payment lookup should happen for trial tryouts
    mockPaymentFindFirst.mockResolvedValue(null);

    const res = await POST(makePostReq({ tryoutId: 5 }));
    expect(res.status).toBe(200);
  });

  it('starts a non-trial tryout through an available free package without payment', async () => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({ packageTryouts: [{ packageId: 7 }] }));
    mockPaymentFindFirst.mockResolvedValue(null);
    const res = await POST(makePostReq({ tryoutId: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).attempt.isNew).toBe(true);
    expect(mockPaymentFindFirst).not.toHaveBeenCalled();
  });

  it.each([true, false])('rejects an empty tryout before creating or resuming an attempt (trial=%s)', async (isTrial) => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({ isTrial, _count: { tryoutQuestions: 0 } }));
    mockPaymentFindFirst.mockResolvedValue({ id: 'verified-payment' });
    mockAttemptFindFirst.mockResolvedValue({ id: 'old-empty-attempt', finishedAt: null });
    const res = await POST(makePostReq({ tryoutId: 1 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'Soal tryout belum tersedia.', reason: 'no_questions', retryable: false,
    });
    expect(mockAttemptFindFirst).not.toHaveBeenCalled();
    expect(mockAttemptCreate).not.toHaveBeenCalled();
  });

  it('still rejects new attempts outside the tryout schedule when the free package grants access', async () => {
    mockTryoutFindUnique.mockResolvedValue(makeTryout({
      packageTryouts: [{ packageId: 7 }], endDate: new Date('2020-01-01'),
    }));
    const res = await POST(makePostReq({ tryoutId: 1 }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('out_of_window');
    expect(mockAttemptCreate).not.toHaveBeenCalled();
  });
});
