import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { QuestionCategory } from "@/lib/types";

export function isQuestionCategory(value: unknown): value is QuestionCategory {
  return value === "TWK" || value === "TIU" || value === "TKP";
}

export function normalizeTopicName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length > 0 && name.length <= 120 ? name : null;
}

export async function validateQuestionTopic(topicId: unknown, category: string): Promise<string | null> {
  if (topicId == null) return null;
  if (typeof topicId !== "number" || !Number.isInteger(topicId) || topicId <= 0 || topicId > 2147483647) {
    return "Topik soal tidak valid.";
  }
  const topic = await prisma.questionTopic.findUnique({ where: { id: topicId }, select: { category: true } });
  if (!topic) return "Topik tidak ditemukan. Muat ulang daftar topik.";
  return topic.category === category ? null : "Topik harus sesuai dengan kategori soal.";
}

export function topicErrorResponse(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "P2002") return NextResponse.json({ error: "Nama topik sudah digunakan dalam kategori ini." }, { status: 409 });
  if (code === "P2025") return NextResponse.json({ error: "Topik tidak ditemukan." }, { status: 404 });
  if (code === "P2003") return NextResponse.json({ error: "Topik berubah atau sedang digunakan. Muat ulang dan coba lagi." }, { status: 409 });
  return NextResponse.json({ error: "Gagal menyimpan perubahan topik." }, { status: 500 });
}
