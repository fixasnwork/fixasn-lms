import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ tryoutId: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const tryoutId = Number((await params).tryoutId);
  if (!Number.isSafeInteger(tryoutId) || tryoutId <= 0 || tryoutId > 2147483647) {
    return NextResponse.json({ error: 'ID tryout tidak valid.' }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Data pilihan soal tidak valid.' }, { status: 400 });
  }
  const ids = body && typeof body === 'object' && 'questionIds' in body ? body.questionIds : null;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 ||
      ids.some((id) => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 || id > 2147483647)) {
    return NextResponse.json({ error: 'Pilih antara 1 dan 200 soal yang valid.' }, { status: 400 });
  }
  const questionIds = [...new Set<number>(ids)];
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Serialize bulk additions to the same tryout, preserving append order.
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM tryouts WHERE id = ${tryoutId} AND "deletedAt" IS NULL FOR UPDATE
      `;
      if (rows.length === 0) return { error: 'Tryout tidak ditemukan.', status: 404 };
      const questions = await tx.question.findMany({
        where: { id: { in: questionIds }, deletedAt: null }, select: { id: true },
      });
      if (questions.length !== questionIds.length) {
        return { error: 'Sebagian soal sudah tidak tersedia. Muat ulang bank soal.', status: 409 };
      }
      const existing = await tx.tryoutQuestion.findMany({
        where: { tryoutId }, select: { questionId: true, sortOrder: true },
      });
      const linked = new Set(existing.map((link) => link.questionId));
      const newIds = questionIds.filter((id) => !linked.has(id));
      const lastOrder = existing.reduce((max, link) => Math.max(max, link.sortOrder), 0);
      if (newIds.length === 0) return { addedCount: 0 };
      const added = await tx.tryoutQuestion.createMany({
        data: newIds.map((questionId, index) => ({ tryoutId, questionId, sortOrder: lastOrder + index + 1 })),
        skipDuplicates: true,
      });
      return { addedCount: added.count };
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, addedCount: result.addedCount });
  } catch {
    return NextResponse.json({ error: 'Gagal menambahkan soal. Muat ulang dan coba lagi.' }, { status: 500 });
  }
}
