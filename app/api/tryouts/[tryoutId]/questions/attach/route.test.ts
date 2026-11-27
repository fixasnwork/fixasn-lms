import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';

const db = vi.hoisted(() => ({
  auth: vi.fn(), $transaction: vi.fn(), $queryRaw: vi.fn(),
  question: { findMany: vi.fn() },
  tryoutQuestion: { findMany: vi.fn(), createMany: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: db.auth }));
const context = { params: Promise.resolve({ tryoutId: '5' }) };
function request(questionIds: unknown) {
  return new NextRequest('http://localhost/api/tryouts/5/questions/attach', {
    method: 'POST', body: JSON.stringify({ questionIds }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  db.auth.mockResolvedValue(null);
  db.$queryRaw.mockResolvedValue([{ id: 5 }]);
  db.question.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
  db.tryoutQuestion.findMany.mockResolvedValue([{ questionId: 1, sortOrder: 8 }]);
  db.tryoutQuestion.createMany.mockResolvedValue({ count: 2 });
  db.$transaction.mockImplementation((callback) => callback(db));
});
describe('attach bank questions', () => {
  it('requires admin access before reading or writing', async () => {
    db.auth.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await POST(request([1]), context)).status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each([[], [0], [-1], ['1'], [1.5], [2147483648], null, Array(201).fill(1)])('rejects invalid selection %j', async (ids) => {
    expect((await POST(request(ids), context)).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('appends existing questions in selection order, deduplicating IDs and preserving existing links', async () => {
    const response = await POST(request([3, 1, 2, 3]), context);
    expect(await response.json()).toEqual({ success: true, addedCount: 2 });
    expect(db.question.findMany).toHaveBeenCalledWith({ where: { id: { in: [3, 1, 2] }, deletedAt: null }, select: { id: true } });
    expect(db.tryoutQuestion.createMany).toHaveBeenCalledWith({ data: [
      { tryoutId: 5, questionId: 3, sortOrder: 9 },
      { tryoutId: 5, questionId: 2, sortOrder: 10 },
    ], skipDuplicates: true });
  });
  it('rejects the whole batch if a selected question was deleted or is missing', async () => {
    db.question.findMany.mockResolvedValue([{ id: 1 }]);
    expect((await POST(request([1, 2]), context)).status).toBe(409);
    expect(db.tryoutQuestion.createMany).not.toHaveBeenCalled();
  });
  it('does not add duplicates when the request is repeated', async () => {
    db.question.findMany.mockResolvedValue([{ id: 1 }]);
    expect(await (await POST(request([1]), context)).json()).toEqual({ success: true, addedCount: 0 });
    expect(db.tryoutQuestion.createMany).not.toHaveBeenCalled();
  });
  it('rejects deleted or missing tryouts', async () => {
    db.$queryRaw.mockResolvedValue([]);
    expect((await POST(request([1]), context)).status).toBe(404);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
});
