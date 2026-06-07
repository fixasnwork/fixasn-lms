import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock admin auth — allow actions by default
vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

// Hoisted mock data — accessible inside vi.mock factories
const { mockPackage } = vi.hoisted(() => ({
  mockPackage: {
    id: 1,
    name: 'Test Pkg',
    description: 'desc',
    price: 50000,
    isTrial: false,
    startDate: new Date('2026-06-01T00:00:00Z'),
    endDate: new Date('2026-12-31T23:59:59Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    tryoutCount: 0,
  },
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    package: {
      findMany: vi.fn().mockResolvedValue([
        { ...mockPackage, _count: { packageTryouts: 0 } },
      ]),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 99, ...data, createdAt: new Date(), updatedAt: new Date(), deletedAt: null })
      ),
    },
  },
}));

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/packages'),
  } as unknown as NextRequest;
}

describe('GET /api/packages', () => {
  it('returns packages array', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.packages)).toBe(true);
  });

  it('each package has required fields', async () => {
    const response = await GET();
    const data = await response.json();
    for (const pkg of data.packages) {
      expect(pkg).toHaveProperty('id');
      expect(pkg).toHaveProperty('name');
      expect(pkg).toHaveProperty('description');
      expect(pkg).toHaveProperty('price');
      expect(pkg).toHaveProperty('isTrial');
      expect(pkg).toHaveProperty('startDate');
      expect(pkg).toHaveProperty('endDate');
      expect(pkg).toHaveProperty('tryoutCount');
      expect(pkg).toHaveProperty('createdAt');
      expect(pkg).toHaveProperty('updatedAt');
      // isActive should NOT be present
      expect(pkg).not.toHaveProperty('isActive');
    }
  });

  it('serializes startDate as ISO string', async () => {
    const response = await GET();
    const data = await response.json();
    expect(data.packages[0].startDate).toBe('2026-06-01T00:00:00.000Z');
  });

  it('serializes endDate as ISO string', async () => {
    const response = await GET();
    const data = await response.json();
    expect(data.packages[0].endDate).toBe('2026-12-31T23:59:59.000Z');
  });
});

describe('POST /api/packages', () => {
  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Package name is required');
  });

  it('returns 400 when name is empty', async () => {
    const response = await POST(makeRequest({ name: '' }));
    expect(response.status).toBe(400);
  });

  it('creates package without dates (inactive)', async () => {
    const response = await POST(makeRequest({ name: 'No Dates' }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.package.startDate).toBeNull();
    expect(data.package.endDate).toBeNull();
  });

  it('creates package with dates — returns dates in response', async () => {
    const response = await POST(
      makeRequest({
        name: 'With Dates',
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-30T23:59:59Z',
      })
    );
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.package.startDate).toBe('2026-06-01T00:00:00.000Z');
    expect(data.package.endDate).toBe('2026-06-30T23:59:59.000Z');
  });

  it('rejects startDate >= endDate when both set', async () => {
    const response = await POST(
      makeRequest({
        name: 'Bad Range',
        startDate: '2026-06-30T00:00:00Z',
        endDate: '2026-06-01T00:00:00Z',
      })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate must be before endDate');
  });

  it('rejects startDate == endDate', async () => {
    const response = await POST(
      makeRequest({
        name: 'Same Date',
        startDate: '2026-06-30T00:00:00Z',
        endDate: '2026-06-30T00:00:00Z',
      })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate must be before endDate');
  });

  it('rejects invalid date strings', async () => {
    const response = await POST(
      makeRequest({ name: 'Invalid Dates', startDate: 'not-a-date', endDate: '2026-06-30T00:00:00Z' })
    );
    expect(response.status).toBe(400);
  });
});
