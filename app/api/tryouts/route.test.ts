import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';

const mockPrisma = vi.hoisted(() => {
  const mockTryout = {
    id: 1,
    name: 'Tryout Test',
    isTrial: false,
    sortOrder: 1,
    durationMin: 100,
    startDate: new Date('2026-06-01T00:00:00Z'),
    endDate: new Date('2026-06-30T23:59:59Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    _count: { tryoutQuestions: 0 },
    packageTryouts: [{ packageId: 1 }],
    tryoutQuestions: [],
  };

  return {
    packageTryout: {
      findMany: vi.fn().mockResolvedValue([{ tryoutId: 1 }]),
    },
    tryout: {
      findMany: vi.fn().mockResolvedValue([mockTryout]),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 2,
        name: data.name,
        isTrial: data.isTrial,
        sortOrder: data.sortOrder,
        durationMin: data.durationMin,
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      })),
    },
    question: { findFirst: vi.fn() },
    questionOption: { createMany: vi.fn() },
    tryoutQuestion: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

function makeReq(url: string) {
  return { nextUrl: new URL(url) } as unknown as Request;
}

function makePostReq(body: Record<string, unknown>) {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/tryouts'),
  } as unknown as Request;
}

describe('GET /api/tryouts', () => {
  it('returns tryouts grouped by packageId', async () => {
    const response = await GET(makeReq('http://localhost/api/tryouts'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('tryouts');
  });

  it('accepts packageId filter', async () => {
    const response = await GET(makeReq('http://localhost/api/tryouts?packageId=1'));
    expect(response.status).toBe(200);
  });

  it('accepts include=questions param', async () => {
    const response = await GET(makeReq('http://localhost/api/tryouts?include=questions'));
    expect(response.status).toBe(200);
  });
});

describe('POST /api/tryouts', () => {
  it('returns 400 when name is missing', async () => {
    const response = await POST(makePostReq({}));
    expect(response.status).toBe(400);
  });

  it('returns 400 when name is empty', async () => {
    const response = await POST(makePostReq({ name: '' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when durationMin out of range', async () => {
    const response = await POST(makePostReq({ name: 'Test', durationMin: 999 }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when startDate >= endDate', async () => {
    const response = await POST(makePostReq({
      name: 'Test',
      startDate: '2026-06-30T00:00:00Z',
      endDate: '2026-06-01T00:00:00Z',
    }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate must be before endDate');
  });

  it('returns 400 when date strings are invalid', async () => {
    const response = await POST(makePostReq({
      name: 'Test',
      startDate: 'not-a-date',
      endDate: '2026-06-01T00:00:00Z',
    }));
    expect(response.status).toBe(400);
  });

  it('creates tryout without dates (inactive)', async () => {
    const response = await POST(makePostReq({ name: 'No Dates' }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.tryout.startDate).toBeNull();
    expect(data.tryout.endDate).toBeNull();
  });
});
