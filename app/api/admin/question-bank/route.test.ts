import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

const db = vi.hoisted(() => ({
  auth: vi.fn(), $transaction: vi.fn(), tryout: { findUnique: vi.fn() },
  question: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: db.auth }));
function request(query: string) { return new NextRequest(`http://localhost/api/admin/question-bank?${query}`); }
beforeEach(() => {
  vi.resetAllMocks();
  db.auth.mockResolvedValue(null);
  db.tryout.findUnique.mockResolvedValue({ id: 5 });
  db.question.findMany.mockResolvedValue([]);
  db.question.count.mockResolvedValue(24);
  db.$transaction.mockImplementation((queries) => Promise.all(queries));
});
describe('admin question bank catalog', () => {
  it('requires admin access', async () => {
    db.auth.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await GET(request('tryoutId=5'))).status).toBe(403);
    expect(db.tryout.findUnique).not.toHaveBeenCalled();
  });
  it('paginates filtered questions, excluding deleted questions and existing links', async () => {
    const response = await GET(request('tryoutId=5&page=2&category=TWK&topic=3&search=pancasila'));
    expect(await response.json()).toEqual({ questions: [], total: 24, page: 2, pageSize: 20 });
    const query = db.question.findMany.mock.calls[0][0];
    expect(query).toMatchObject({ skip: 20, take: 20, orderBy: { id: 'asc' }, where: {
      deletedAt: null, tryoutQuestions: { none: { tryoutId: 5 } }, category: 'TWK', topicId: 3,
      question: { contains: 'pancasila', mode: 'insensitive' },
    } });
    expect(db.question.count).toHaveBeenCalledWith({ where: query.where });
  });
  it('supports questions with no topic', async () => {
    await GET(request('tryoutId=5&topic=unassigned'));
    expect(db.question.findMany.mock.calls[0][0].where.topicId).toBeNull();
  });
  it.each(['tryoutId=0', 'tryoutId=5&page=-1', 'tryoutId=5&category=OTHER', 'tryoutId=5&topic=nope'])('rejects invalid filters %s', async (query) => {
    expect((await GET(request(query))).status).toBe(400);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
  it('rejects a missing or deleted target tryout', async () => {
    db.tryout.findUnique.mockResolvedValue(null);
    expect((await GET(request('tryoutId=5'))).status).toBe(404);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
});
