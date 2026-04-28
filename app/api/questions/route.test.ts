import { describe, it, expect } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

function makeRequest(url: string) {
  return { nextUrl: new URL(url, 'http://localhost') } as unknown as NextRequest;
}

describe('GET /api/questions', () => {
  it('returns all questions when no set param is provided', async () => {
    const response = await GET(makeRequest('/api/questions'));
    const data = await response.json();

    expect(Array.isArray(data.questions)).toBe(true);
    // Should include both set A and set B
    expect(data.questions.length).toBeGreaterThan(110);
  });

  it('returns only set A questions when set=a', async () => {
    const response = await GET(makeRequest('/api/questions?set=a'));
    const data = await response.json();

    // Set A has 35 TWK + 30 TIU + 45 TKP = 110 questions
    expect(data.questions.length).toBe(110);
  });

  it('returns only set B questions when set=b', async () => {
    const response = await GET(makeRequest('/api/questions?set=b'));
    const data = await response.json();

    // Set B has 30 TWK + 35 TIU + 45 TKP = 110 questions
    expect(data.questions.length).toBe(110);
    expect(data.questions[0].cat).toBe('TWK');
  });

  it('returns trial questions (10) when set=trial', async () => {
    const response = await GET(makeRequest('/api/questions?set=trial'));
    const data = await response.json();

    expect(data.questions.length).toBe(10);
    // Verify mix: 3 TWK + 4 TIU + 3 TKP
    const cats = data.questions.map((q: { cat: string }) => q.cat);
    expect(cats.filter((c: string) => c === 'TWK').length).toBe(3);
    expect(cats.filter((c: string) => c === 'TIU').length).toBe(4);
    expect(cats.filter((c: string) => c === 'TKP').length).toBe(3);
  });
});

describe('POST /api/questions', () => {
  it('echoes back the submitted question', async () => {
    const question = { cat: 'TWK', q: 'Test?', opts: ['A', 'B'], ans: 0 };
    const response = await POST({ json: async () => question } as unknown as NextRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.question).toEqual(question);
  });
});
