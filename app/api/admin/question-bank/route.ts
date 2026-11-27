import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { isQuestionCategory } from '@/lib/questionTopics';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const params = request.nextUrl.searchParams;
  const tryoutId = Number(params.get('tryoutId'));
  const page = Number(params.get('page') ?? 1);
  const category = params.get('category');
  const topic = params.get('topic');
  const search = (params.get('search') ?? '').trim();
  if (!Number.isSafeInteger(tryoutId) || tryoutId <= 0 || tryoutId > 2147483647 ||
      !Number.isSafeInteger(page) || page < 1 || page > 100000 || search.length > 200 ||
      (category && !isQuestionCategory(category)) ||
      (topic && topic !== 'unassigned' && (!Number.isSafeInteger(Number(topic)) || Number(topic) <= 0 || Number(topic) > 2147483647))) {
    return NextResponse.json({ error: 'Filter bank soal tidak valid.' }, { status: 400 });
  }
  try {
    const tryout = await prisma.tryout.findUnique({ where: { id: tryoutId, deletedAt: null }, select: { id: true } });
    if (!tryout) return NextResponse.json({ error: 'Tryout tidak ditemukan.' }, { status: 404 });
    const where: Prisma.QuestionWhereInput = {
      deletedAt: null,
      tryoutQuestions: { none: { tryoutId } },
      ...(category ? { category } : {}),
      ...(topic ? { topicId: topic === 'unassigned' ? null : Number(topic) } : {}),
      ...(search ? { question: { contains: search, mode: 'insensitive' } } : {}),
    };
    const pageSize = 20;
    const [questions, total] = await prisma.$transaction([
      prisma.question.findMany({
        where, orderBy: { id: 'asc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, category: true, question: true, questionImage: true, topic: { select: { name: true } } },
      }),
      prisma.question.count({ where }),
    ]);
    return NextResponse.json({ questions, total, page, pageSize });
  } catch {
    return NextResponse.json({ error: 'Gagal memuat bank soal.' }, { status: 500 });
  }
}
