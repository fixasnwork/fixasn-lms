import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { isQuestionCategory, normalizeTopicName, topicErrorResponse } from "@/lib/questionTopics";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;
  try {
    const topics = await prisma.questionTopic.findMany({
      select: { id: true, category: true, name: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ topics }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gagal memuat topik soal." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  const name = normalizeTopicName(body?.name);
  if (!name || !isQuestionCategory(body?.category)) {
    return NextResponse.json({ error: "Pilih kategori TWK/TIU/TKP dan isi nama topik (maksimal 120 karakter)." }, { status: 400 });
  }
  try {
    const topic = await prisma.questionTopic.create({
      data: { category: body.category, name }, select: { id: true, category: true, name: true },
    });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    return topicErrorResponse(error);
  }
}
