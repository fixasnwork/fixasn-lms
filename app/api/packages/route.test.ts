import { describe, it, expect, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { NextRequest } from 'next/server';

function makePostRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

// Reset packages to default state before each test
beforeEach(() => {
  // Import dynamically to get fresh module state
  // The route module has in-memory state that persists across tests
});

describe('GET /api/packages', () => {
  it('returns packages array', async () => {
    const response = await GET();
    const data = await response.json();

    expect(Array.isArray(data.packages)).toBe(true);
    expect(data.packages.length).toBeGreaterThan(0);
  });

  it('packages have required fields', async () => {
    const response = await GET();
    const data = await response.json();

    const pkg = data.packages[0];
    expect(pkg).toHaveProperty('id');
    expect(pkg).toHaveProperty('name');
    expect(pkg).toHaveProperty('price');
    expect(pkg).toHaveProperty('tryouts');
    expect(pkg).toHaveProperty('desc');
    expect(pkg).toHaveProperty('popular');
    expect(pkg).toHaveProperty('video');
    expect(pkg).toHaveProperty('comingSoon');
  });
});

describe('PUT /api/packages', () => {
  it('updates packages when valid array is sent', async () => {
    const newPackages = [
      { id: 'test', name: 'Test Package', tryouts: 1, price: 1000, desc: 'Test', popular: false, video: false, comingSoon: false },
    ];
    const response = await PUT(makePostRequest({ packages: newPackages }));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.packages).toEqual(newPackages);
  });

  it('returns 400 when packages is not an array', async () => {
    const response = await PUT(makePostRequest({ packages: 'not-an-array' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid data');
  });

  it('returns 400 when packages is missing', async () => {
    const response = await PUT(makePostRequest({}));

    expect(response.status).toBe(400);
  });
});
