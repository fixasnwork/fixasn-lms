import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';

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
});
