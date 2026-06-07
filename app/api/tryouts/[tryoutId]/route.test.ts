import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from './route';

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

// Mock prisma for tests that need DB access (hoisted so mockPrisma is available early)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    tryout: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (fns: unknown[]) => Promise.all(fns)),
  };
  return { mockPrisma };
});

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

const EXISTING_TRYOUT = {
  id: 1,
  name: 'Test Tryout',
  isTrial: false,
  sortOrder: 0,
  durationMin: 100,
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function makeParams(tryoutId: string) {
  return { params: Promise.resolve({ tryoutId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tryout.findFirst.mockImplementation(async (args: { where?: { id?: number } }) => {
    if (args.where?.id === 999999) return null;
    return EXISTING_TRYOUT;
  });
  mockPrisma.tryout.update.mockImplementation(async () => EXISTING_TRYOUT);
  mockPrisma.tryout.count.mockResolvedValue(0);
});

describe('GET /api/tryouts/[tryoutId]', () => {
  it('returns 400 for invalid tryoutId', async () => {
    const response = await GET({} as Request, makeParams('abc'));
    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent tryout', async () => {
    const response = await GET({} as Request, makeParams('999999'));
    expect(response.status).toBe(404);
  });
});

describe('PUT /api/tryouts/[tryoutId]', () => {
  it('returns 400 for invalid tryoutId', async () => {
    const req = { json: async () => ({ name: 'Test' }) } as unknown as Request;
    const response = await PUT(req, makeParams('abc'));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid durationMin', async () => {
    const req = { json: async () => ({ durationMin: 0 }) } as unknown as Request;
    const response = await PUT(req, makeParams('1'));
    expect(response.status).toBe(400);
  });

  it('returns 400 when startDate >= endDate', async () => {
    const req = {
      json: async () => ({
        name: 'Test',
        startDate: '2026-06-30T00:00:00Z',
        endDate: '2026-06-01T00:00:00Z',
      }),
    } as unknown as Request;
    const response = await PUT(req, makeParams('1'));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate must be before endDate');
  });

  it('returns 400 when date strings are invalid', async () => {
    const req = {
      json: async () => ({ startDate: 'not-a-date' }),
    } as unknown as Request;
    const response = await PUT(req, makeParams('1'));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate and endDate must be valid dates');
  });

  it('allows setting endDate to null', async () => {
    const req = {
      json: async () => ({ endDate: null }),
    } as unknown as Request;
    const response = await PUT(req, makeParams('1'));
    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/tryouts/[tryoutId]', () => {
  it('returns 400 for invalid tryoutId', async () => {
    const response = await DELETE({} as Request, makeParams('xyz'));
    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent tryout', async () => {
    const response = await DELETE({} as Request, makeParams('999999'));
    expect(response.status).toBe(404);
  });
});
