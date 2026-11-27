vi.mock('@/lib/routeAuth', () => ({ requireActiveSession: vi.fn().mockResolvedValue({ ok: true, session: { user: { email: 'user-1', name: 'Test User' } } }) }));
vi.mock('@/lib/packageAccessServer', () => ({ hasTryoutAccess: vi.fn().mockResolvedValue(true) }));
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Prisma mock — controlled per test
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    tryout: { findUnique: mockFindUnique },
    tryoutAttempt: { create: mockCreate },
  },
}));

// Helper to build a POST NextRequest
function makePostReq(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/tryout-attempts'),
  } as unknown as NextRequest;
}

// ── Helpers to build Prisma-shaped tryout objects ────────────────
function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Paket Test',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2999-12-31T23:59:59Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeTryout(
  pkgOverrides?: Record<string, unknown>,
  tryoutOverrides: Record<string, unknown> = {}
) {
  const pkg = pkgOverrides ? makePackage(pkgOverrides) : makePackage();
  return {
    id: 1,
    name: 'Tryout 1',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2999-12-31T23:59:59Z') as Date | null,
    deletedAt: null,
    packageTryouts: pkgOverrides !== undefined ? [{ package: pkg }] : [],
    _count: { tryoutQuestions: 110 },
    ...tryoutOverrides,
  };
}

// ── Attempt body ─────────────────────────────────────────────────
const BASE_BODY = {
  userId: 'user-1',
  userName: 'Test User',
  tryoutId: 1,
};

const MOCK_ATTEMPT = {
  id: 'att-1',
  userId: 'user-1',
  userName: 'Test User',
  tryoutId: 1,
  twkScore: 0,
  tiuScore: 0,
  tkpScore: 0,
  totalScore: 0,
  answers: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('POST /api/tryout-attempts — availability gate', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(MOCK_ATTEMPT);
    vi.resetModules();
    vi.doMock('@/lib/prisma', () => ({
      default: {
        tryout: { findUnique: mockFindUnique },
        tryoutAttempt: { create: mockCreate },
      },
    }));
    const mod = await import('./route');
    POST = mod.POST;
  });

  it('open tryout with open parent package → 201', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout({ startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2999-12-31T23:59:59Z') })
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.attempt).toBeDefined();
  });

  it('rejects empty tryouts without creating an attempt', async () => {
    mockFindUnique.mockResolvedValue(makeTryout(undefined, { _count: { tryoutQuestions: 0 } }));
    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'Soal tryout belum tersedia.', reason: 'no_questions', retryable: false,
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tryout with null startDate → 403 + reason=out_of_window', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout(
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2999-12-31T23:59:59Z') },
        { startDate: null }
      )
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('tryout_unavailable');
    expect(data.reason).toBe('out_of_window');
    expect(data.retryable).toBe(true);
  });

  it('tryout with null endDate → active indefinitely → success', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout(
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2999-12-31T23:59:59Z') },
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: null }
      )
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('tryout with endDate in past → 403 + reason=out_of_window', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout(
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2999-12-31T23:59:59Z') },
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-01-02T00:00:00Z') }
      )
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('tryout_unavailable');
    expect(data.reason).toBe('out_of_window');
    expect(data.retryable).toBe(true);
  });

  it('tryout with startDate in future → 403 + reason=out_of_window', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout(
        { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2999-12-31T23:59:59Z') },
        { startDate: new Date('2999-01-01T00:00:00Z'), endDate: null }
      )
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('tryout_unavailable');
    expect(data.reason).toBe('out_of_window');
    expect(data.retryable).toBe(true);
  });

  it('closed sales window does not revoke purchased access', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout({
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-02T00:00:00Z'),
      })
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('parent package endDate=null → active indefinitely → success', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout({
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: null,
      })
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('parent package with open dates → success', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout({
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2999-12-31T23:59:59Z'),
      })
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('tryout with no packageTryouts but open window → 201 success', async () => {
    mockFindUnique.mockResolvedValue(
      makeTryout(undefined, {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2999-12-31T23:59:59Z'),
        packageTryouts: [],
      })
    );

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('tryout not found → 404', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await POST(makePostReq(BASE_BODY));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Tryout not found');
  });
});
