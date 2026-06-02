import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock admin auth — allow actions by default
vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

function makeRequest(method: string, body: Record<string, unknown>) {
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
      expect(pkg).toHaveProperty('isActive');
      expect(pkg).toHaveProperty('tryoutCount');
      expect(pkg).toHaveProperty('createdAt');
      expect(pkg).toHaveProperty('updatedAt');
    }
  });
});

describe('POST /api/packages', () => {
  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest('POST', {}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Package name is required');
  });

  it('returns 400 when name is empty', async () => {
    const response = await POST(makeRequest('POST', { name: '' }));
    expect(response.status).toBe(400);
  });
});
