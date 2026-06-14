import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock handles (so vi.mock factories can reference them) ──
const { mockAuth, mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

vi.mock('@/lib/routeAuth', () => ({
  requireActiveSession: vi.fn().mockImplementation(() =>
    Promise.resolve({ ok: true, session: SESSION })
  ),
}));

vi.mock('@/lib/prisma', () => {
  const tryoutAttempt = {
    findUnique: mockFindUnique,
    update: mockUpdate,
  };
  return {
    default: { tryoutAttempt },
    tryoutAttempt,
  };
});

const SESSION = {
  user: { email: 'user@test.id', name: 'Test', role: 'user' },
  expires: '2099-01-01',
};

// ── Helpers ──
function makeGetReq(): Request {
  return { nextUrl: new URL('http://localhost/api/tryout-attempts/att-1') } as unknown as Request;
}

function makePutReq(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/tryout-attempts/att-1'),
  } as unknown as Request;
}

function makeParams(attemptId: string) {
  return Promise.resolve({ attemptId });
}

function makeAttemptWithAnswers(answers: Array<{ questionIndex: number; selectedOption: number; raguRagu: boolean }>) {
  return {
    id: 'att-1',
    userId: 'user@test.id',
    userName: 'Test',
    tryoutId: 1,
    twkScore: 0,
    tiuScore: 0,
    tkpScore: 0,
    totalScore: 0,
    answers,
    tryout: {
      id: 1,
      name: 'Tryout 1',
      isTrial: true,
      sortOrder: 0,
      durationMin: 15,
      tryoutQuestions: [],
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('GET /api/tryout-attempts/[attemptId] — Ragu-ragu flag', () => {
  let GET: (req: Request, ctx: { params: Promise<{ attemptId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION);
    const mod = await import('./route');
    GET = mod.GET;
  });

  it('returns raguRagu sibling map alongside answers', async () => {
    mockFindUnique.mockResolvedValue(
      makeAttemptWithAnswers([
        { questionIndex: 0, selectedOption: 1, raguRagu: true },
        { questionIndex: 1, selectedOption: -1, raguRagu: false },
        { questionIndex: 2, selectedOption: 2, raguRagu: true },
      ])
    );

    const res = await GET(makeGetReq() as unknown as Request, { params: makeParams('att-1') });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attempt.answers).toEqual({ 0: 1, 1: -1, 2: 2 });
    expect(data.attempt.raguRagu).toEqual({ 0: true, 1: false, 2: true });
  });

  it('returns empty raguRagu map when no answers exist', async () => {
    mockFindUnique.mockResolvedValue(makeAttemptWithAnswers([]));
    const res = await GET(makeGetReq() as unknown as Request, { params: makeParams('att-1') });
    const data = await res.json();
    expect(data.attempt.answers).toEqual({});
    expect(data.attempt.raguRagu).toEqual({});
  });

  it('GET returns finishedAt null for in-progress attempts', async () => {
    mockFindUnique.mockResolvedValue(
      makeAttemptWithAnswers([
        { questionIndex: 0, selectedOption: 1, raguRagu: false },
      ])
    );

    const res = await GET(makeGetReq() as unknown as Request, { params: makeParams('att-1') });
    const data = await res.json();
    expect(data.attempt).toHaveProperty('finishedAt');
    expect(data.attempt.finishedAt).toBeNull();
  });

  it('GET returns finishedAt ISO string for finished attempts', async () => {
    const finished = new Date('2026-06-14T10:00:00.000Z');
    mockFindUnique.mockResolvedValue({
      ...makeAttemptWithAnswers([
        { questionIndex: 0, selectedOption: 1, raguRagu: false },
      ]),
      finishedAt: finished,
    });

    const res = await GET(makeGetReq() as unknown as Request, { params: makeParams('att-1') });
    const data = await res.json();
    expect(data.attempt.finishedAt).toBe('2026-06-14T10:00:00.000Z');
  });
});

describe('PUT /api/tryout-attempts/[attemptId] — Ragu-ragu flag', () => {
  let PUT: (req: Request, ctx: { params: Promise<{ attemptId: string }> }) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION);
    mockUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'att-1',
      totalScore: 0,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      ...data,
    }));
    const mod = await import('./route');
    PUT = mod.PUT;
  });

  it('score-writing PUT sets finishedAt', async () => {
    const before = new Date('2025-01-01T00:00:00Z');
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
      createdAt: before,
      updatedAt: before,
    });

    const res = await PUT(
      makePutReq({
        answers: { 0: 1 },
        twkScore: 5,
        tiuScore: 5,
        tkpScore: 10,
        totalScore: 20,
      }),
      { params: makeParams('att-1') }
    );

    expect(res.status).toBe(200);

    const updateCall = mockUpdate.mock.calls[0][0];
    // finishedAt is a Date set to now — verify it's present and recent
    expect(updateCall.data.finishedAt).toBeInstanceOf(Date);
    const now = Date.now();
    expect(updateCall.data.finishedAt.getTime()).toBeGreaterThanOrEqual(now - 5000);
  });

  it('flag-only PUT does not set finishedAt', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await PUT(
      makePutReq({ raguRaguFlags: { 0: true } }),
      { params: makeParams('att-1') }
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.finishedAt).toBeUndefined();
  });

  it('re-submit does not overwrite existing finishedAt', async () => {
    const existingFinished = new Date('2026-01-01T00:00:00Z');
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 50,
      tiuScore: 60,
      tkpScore: 100,
      totalScore: 210,
      finishedAt: existingFinished,
    });

    await PUT(
      makePutReq({
        answers: { 0: 2 },
        twkScore: 55,
        tiuScore: 65,
        tkpScore: 105,
        totalScore: 225,
      }),
      { params: makeParams('att-1') }
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    // finishedAt should be undefined (not sent), preserving the existing value
    expect(updateCall.data.finishedAt).toBeUndefined();
  });

  it('accepts raguRaguFlags only and writes them via upsert (create path)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
    });

    const res = await PUT(
      makePutReq({ raguRaguFlags: { 0: true, 2: true } }),
      { params: makeParams('att-1') }
    );
    expect(res.status).toBe(200);

    const updateCall = mockUpdate.mock.calls[0][0];
    const upsert = updateCall.data.answers.upsert;
    expect(upsert).toHaveLength(2);
    expect(upsert[0].create).toMatchObject({ questionIndex: 0, raguRagu: true, selectedOption: -1 });
    expect(upsert[0].update).toEqual({ raguRagu: true });
    expect(upsert[1].create).toMatchObject({ questionIndex: 2, raguRagu: true });
  });

  it('flag-only write does not touch selectedOption in update clause', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
    });

    await PUT(
      makePutReq({ raguRaguFlags: { 5: false } }),
      { params: makeParams('att-1') }
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    const row = updateCall.data.answers.upsert[0];
    expect(row.update).toEqual({ raguRagu: false });
    expect(row.update).not.toHaveProperty('selectedOption');
  });

  it('writes both answers and flags in a single upsert call', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
    });

    await PUT(
      makePutReq({
        answers: { 0: 2, 1: 3 },
        raguRaguFlags: { 2: true },
      }),
      { params: makeParams('att-1') }
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    const upsert = updateCall.data.answers.upsert;
    expect(upsert).toHaveLength(3);
    const byIdx: Record<number, { update: Record<string, unknown> }> = {};
    for (const r of upsert) {
      byIdx[r.where.attemptId_questionIndex.questionIndex] = r;
    }
    expect(byIdx[0].update).toEqual({ selectedOption: 2 });
    expect(byIdx[1].update).toEqual({ selectedOption: 3 });
    expect(byIdx[2].update).toEqual({ raguRagu: true });
  });

  it('omitting raguRaguFlags from body does not emit flag upsert rows', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'att-1',
      userId: 'user@test.id',
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
    });

    await PUT(
      makePutReq({ answers: { 0: 1 } }),
      { params: makeParams('att-1') }
    );

    const updateCall = mockUpdate.mock.calls[0][0];
    const upsert = updateCall.data.answers.upsert;
    expect(upsert).toHaveLength(1);
    expect(upsert[0].update).toEqual({ selectedOption: 1 });
  });
});
