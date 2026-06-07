import { describe, it, expect, vi } from 'vitest';
import { PUT } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

const existingPkg = {
  id: 1,
  name: 'Existing Pkg',
  description: 'desc',
  price: 50000,
  isTrial: false,
  startDate: new Date('2026-06-01T00:00:00Z'),
  endDate: new Date('2026-12-31T23:59:59Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  tryoutCount: 0,
};

const existingPkgNoDates = {
  ...existingPkg,
  id: 2,
  startDate: null,
  endDate: null,
};

vi.mock('@/lib/prisma', () => ({
  default: {
    package: {
      findFirst: vi.fn().mockImplementation(({ where: w }) => {
        if (w.id === 1) return Promise.resolve(existingPkg);
        if (w.id === 2) return Promise.resolve(existingPkgNoDates);
        return Promise.resolve(null);
      }),
      update: vi.fn().mockImplementation(({ where: _where, data }) =>
        Promise.resolve({ ...existingPkg, ...data, updatedAt: new Date() })
      ),
    },
  },
}));

function makePutRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('PUT /api/packages/[packageId]', () => {
  it('updates startDate', async () => {
    const response = await PUT(makePutRequest({ startDate: '2026-07-01T00:00:00Z' }), {
      params: Promise.resolve({ packageId: '1' }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.package.startDate).toBe('2026-07-01T00:00:00.000Z');
  });

  it('rejects startDate >= endDate when both set', async () => {
    const response = await PUT(
      makePutRequest({ startDate: '2026-12-31T23:59:59Z', endDate: '2026-06-01T00:00:00Z' }),
      { params: Promise.resolve({ packageId: '1' }) }
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('startDate must be before endDate');
  });

  it('can set both dates validly', async () => {
    const response = await PUT(
      makePutRequest({
        startDate: '2026-07-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
      }),
      { params: Promise.resolve({ packageId: '1' }) }
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.package.startDate).toBe('2026-07-01T00:00:00.000Z');
    expect(data.package.endDate).toBe('2026-12-31T23:59:59.000Z');
  });

  it('allows setting startDate to null', async () => {
    const response = await PUT(
      makePutRequest({ startDate: null }),
      { params: Promise.resolve({ packageId: '1' }) }
    );
    expect(response.status).toBe(200);
  });

  it('allows setting endDate to null', async () => {
    const response = await PUT(
      makePutRequest({ endDate: null }),
      { params: Promise.resolve({ packageId: '1' }) }
    );
    expect(response.status).toBe(200);
  });

  it('allows updating package with no dates', async () => {
    const response = await PUT(
      makePutRequest({ name: 'Updated' }),
      { params: Promise.resolve({ packageId: '2' }) }
    );
    expect(response.status).toBe(200);
  });

  it('returns 404 for nonexistent package', async () => {
    const response = await PUT(makePutRequest({ name: 'x' }), {
      params: Promise.resolve({ packageId: '999' }),
    });
    expect(response.status).toBe(404);
  });
});
