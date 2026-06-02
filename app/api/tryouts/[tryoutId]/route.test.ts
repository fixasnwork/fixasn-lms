import { describe, it, expect, vi } from 'vitest';
import { GET, PUT, DELETE } from './route';

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

function makeParams(tryoutId: string) {
  return { params: Promise.resolve({ tryoutId }) };
}

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
