import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import prisma from "@/lib/prisma";
import { normalizeTopicName, topicErrorResponse } from "@/lib/questionTopics";

type Context = { params: Promise<{ topicId: string }> };
function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const id = parseId((await params).topicId);
  const body = await request.json().catch(() => null);
  const name = normalizeTopicName(body?.name);
  if (!id || !name || body?.category !== undefined) {
    return NextResponse.json({ error: "Isi nama topik yang valid (maksimal 120 karakter). Kategori topik tidak dapat diubah." }, { status: 400 });
  }
  try {
    const topic = await prisma.questionTopic.update({
      where: { id }, data: { name }, select: { id: true, category: true, name: true },
    });
    return NextResponse.json({ topic });
  } catch (error) {
    return topicErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authError = await requireAdmin();
  if (authError) return authError;
  const id = parseId((await params).topicId);
  if (!id) return NextResponse.json({ error: "Topik tidak valid." }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.question.updateMany({ where: { topicId: id }, data: { topicId: null } });
      await tx.questionTopic.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return topicErrorResponse(error);
  }
}
